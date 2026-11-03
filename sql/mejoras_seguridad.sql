-- =====================================================================
-- MEJORAS DE SEGURIDAD ADICIONALES — VOTO ELECTRÓNICO
-- =====================================================================
-- Ejecuta este archivo UNA vez, después de haber aplicado schema.sql
-- (instalación nueva) o migracion_multi_anio.sql (instalación existente).
-- Es seguro volver a ejecutarlo: usa "if not exists" y "create or replace".
--
-- QUÉ AGREGA
--
-- 1. Límite de intentos fallidos por dispositivo/IP en las dos RPC
--    públicas de votación (fn_consultar_estudiante y fn_emitir_voto).
--    Antes, cualquiera podía probar DNIs al azar sin ninguna barrera y
--    terminar reconstruyendo el padrón (nombres, grado, sección, si ya
--    votó) o buscando un DNI válido para votar en nombre de otro
--    estudiante. Ahora, después de varios DNIs inválidos/no encontrados
--    seguidos desde el mismo origen, la RPC rechaza nuevos intentos por
--    unos minutos.
--
--    IMPORTANTE: solo se cuentan los intentos FALLIDOS (DNI con formato
--    inválido o que no existe en el padrón). Una consulta o un voto
--    exitoso NUNCA cuenta contra el límite, así que muchos estudiantes
--    votando normalmente desde el mismo WiFi del colegio (misma IP
--    pública) no se bloquean entre sí.
--
-- 2. Limpieza automática de esos registros de intentos (vía pg_cron)
--    para que la tabla no crezca indefinidamente.
--
-- QUÉ NO TOCA
--
-- Ninguna tabla, política RLS, vista ni función existente cambia su
-- comportamiento salvo fn_consultar_estudiante y fn_emitir_voto, que
-- se modifican SOLO para agregar la verificación/registro de intentos;
-- toda su lógica original (horarios, roles, doble voto, etc.) permanece
-- idéntica.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLA DE INTENTOS FALLIDOS
-- ---------------------------------------------------------------------
create table if not exists intentos_fallidos_voto (
  id            bigint generated always as identity primary key,
  identificador text not null,
  tipo          text not null check (tipo in ('consulta','voto')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_intentos_fallidos_id_tipo_fecha
  on intentos_fallidos_voto(identificador, tipo, created_at desc);

alter table intentos_fallidos_voto enable row level security;

drop policy if exists "intentos_fallidos_admin_select" on intentos_fallidos_voto;
create policy "intentos_fallidos_admin_select" on intentos_fallidos_voto
  for select using (fn_es_admin());
-- No hay política para anon/authenticated a propósito: esta tabla solo
-- se escribe/lee desde funciones SECURITY DEFINER internas.

-- ---------------------------------------------------------------------
-- 2. IDENTIFICAR AL CLIENTE (IP) DESDE LA RPC
-- ---------------------------------------------------------------------
-- Supabase (PostgREST) expone los headers de la petición en
-- request.headers. Se usa x-forwarded-for para identificar el origen.
-- Si por alguna razón no está disponible, se devuelve 'desconocido' y
-- el límite simplemente no se aplica (para no bloquear votantes reales
-- por un problema de infraestructura).
create or replace function fn_obtener_ip_cliente()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_headers json;
  v_forwarded text;
  v_ip text;
begin
  begin
    v_headers := current_setting('request.headers', true)::json;
  exception when others then
    return 'desconocido';
  end;
  if v_headers is null then return 'desconocido'; end if;
  v_forwarded := v_headers->>'x-forwarded-for';
  if v_forwarded is null or trim(v_forwarded) = '' then return 'desconocido'; end if;
  v_ip := trim(split_part(v_forwarded, ',', 1));
  if v_ip = '' then return 'desconocido'; end if;
  return v_ip;
end;
$$;
revoke all on function fn_obtener_ip_cliente() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. REGISTRAR Y VERIFICAR INTENTOS
-- ---------------------------------------------------------------------
create or replace function fn_registrar_intento_fallido(p_tipo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into intentos_fallidos_voto(identificador, tipo)
  values (fn_obtener_ip_cliente(), p_tipo);
end;
$$;
revoke all on function fn_registrar_intento_fallido(text) from public, anon, authenticated;

-- Ajusta v_max / v_ventana aquí si el límite resulta muy estricto o muy
-- laxo durante las pruebas reales.
create or replace function fn_verificar_limite_intentos(p_tipo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip text := fn_obtener_ip_cliente();
  v_max integer := case p_tipo when 'consulta' then 12 when 'voto' then 8 else 10 end;
  v_ventana interval := interval '10 minutes';
  v_intentos integer;
begin
  if v_ip = 'desconocido' then return; end if;

  select count(*) into v_intentos
  from intentos_fallidos_voto
  where identificador = v_ip
    and tipo = p_tipo
    and created_at > now() - v_ventana;

  if v_intentos >= v_max then
    raise exception 'Demasiados intentos fallidos desde este dispositivo. Espera unos minutos e inténtalo de nuevo.';
  end if;
end;
$$;
revoke all on function fn_verificar_limite_intentos(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. fn_consultar_estudiante — misma lógica original + límite de intentos
-- ---------------------------------------------------------------------
create or replace function fn_consultar_estudiante(p_dni text)
returns table (
  estudiante_id bigint, nombres text, apellidos text, grado text,
  seccion text, mesa_id bigint, mesa_nombre text, ha_votado boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eleccion eleccion%rowtype;
  v_inicio timestamptz;
  v_fin timestamptz;
  v_ahora timestamptz := now();
  v_dni text := regexp_replace(coalesce(p_dni,''), '\s+', '', 'g');
begin
  -- NUEVO: corta temprano si este origen ya acumuló demasiados intentos
  -- fallidos recientes (fuerza bruta de DNI).
  perform fn_verificar_limite_intentos('consulta');

  if v_dni !~ '^[0-9]{8}$' then
    perform fn_registrar_intento_fallido('consulta');
    raise exception 'Ingresa un DNI válido de 8 dígitos.';
  end if;
  select * into v_eleccion from eleccion order by id desc limit 1;
  if not found then raise exception 'No hay una elección configurada.'; end if;

  v_inicio := (v_eleccion.fecha + v_eleccion.hora_inicio) at time zone 'America/Lima';
  v_fin := (v_eleccion.fecha + v_eleccion.hora_fin) at time zone 'America/Lima';
  if v_eleccion.hora_fin <= v_eleccion.hora_inicio then v_fin := v_fin + interval '1 day'; end if;

  if v_eleccion.estado <> 'abierta' then raise exception 'La elección no está abierta en este momento.'; end if;
  if v_ahora < v_inicio then raise exception 'La votación todavía no ha comenzado.'; end if;
  if v_ahora >= v_fin then
    update eleccion set estado='cerrada' where id=v_eleccion.id and estado='abierta';
    raise exception 'La votación ya terminó.';
  end if;

  return query
    select e.id,e.nombres,e.apellidos,e.grado,e.seccion,m.id,m.nombre,
           exists(select 1 from votantes v where v.eleccion_id=v_eleccion.id and v.estudiante_id=e.id)
    from estudiantes e
    left join mesas m on m.id=e.mesa_id
    where e.dni=v_dni;
  if not found then
    -- NUEVO: cuenta como intento fallido (posible enumeración del padrón).
    perform fn_registrar_intento_fallido('consulta');
    raise exception 'El DNI ingresado no figura en el padrón electoral.';
  end if;
end;
$$;
revoke all on function fn_consultar_estudiante(text) from public;
grant execute on function fn_consultar_estudiante(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. fn_emitir_voto — misma lógica original + límite de intentos
-- ---------------------------------------------------------------------
create or replace function fn_emitir_voto(p_dni text, p_lista_id bigint default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eleccion eleccion%rowtype;
  v_inicio timestamptz;
  v_fin timestamptz;
  v_estudiante estudiantes%rowtype;
  v_lista_ok boolean;
  v_insertado bigint;
  v_dni text := regexp_replace(coalesce(p_dni,''), '\s+', '', 'g');
begin
  -- NUEVO: mismo límite anti fuerza-bruta que en la consulta.
  perform fn_verificar_limite_intentos('voto');

  if v_dni !~ '^[0-9]{8}$' then raise exception 'Ingresa un DNI válido de 8 dígitos.'; end if;
  select * into v_eleccion from eleccion order by id desc limit 1;
  if not found then raise exception 'No hay una elección configurada.'; end if;

  v_inicio := (v_eleccion.fecha + v_eleccion.hora_inicio) at time zone 'America/Lima';
  v_fin := (v_eleccion.fecha + v_eleccion.hora_fin) at time zone 'America/Lima';
  if v_eleccion.hora_fin <= v_eleccion.hora_inicio then v_fin := v_fin + interval '1 day'; end if;

  if v_eleccion.estado <> 'abierta' then raise exception 'La elección no está abierta en este momento.'; end if;
  if now() < v_inicio then raise exception 'La votación todavía no ha comenzado.'; end if;
  if now() >= v_fin then
    update eleccion set estado='cerrada' where id=v_eleccion.id and estado='abierta';
    raise exception 'La votación ya terminó.';
  end if;

  select * into v_estudiante from estudiantes where dni=v_dni for update;
  if not found then
    -- NUEVO: cuenta como intento fallido (posible búsqueda de un DNI
    -- válido para votar en nombre de otro estudiante).
    perform fn_registrar_intento_fallido('voto');
    raise exception 'El DNI ingresado no figura en el padrón electoral.';
  end if;
  if v_estudiante.mesa_id is null then raise exception 'El estudiante no tiene una mesa asignada.'; end if;

  if p_lista_id is not null then
    select exists(select 1 from listas where id=p_lista_id and activa=true and eleccion_id=v_eleccion.id) into v_lista_ok;
    if not v_lista_ok then raise exception 'La lista seleccionada no es válida para esta elección.'; end if;
  end if;

  insert into votantes(eleccion_id,estudiante_id) values(v_eleccion.id,v_estudiante.id)
  on conflict(eleccion_id,estudiante_id) do nothing returning id into v_insertado;
  if v_insertado is null then raise exception 'Este estudiante ya emitió su voto.'; end if;

  insert into votos(eleccion_id,mesa_id,lista_id,es_blanco)
  values(v_eleccion.id,v_estudiante.mesa_id,p_lista_id,p_lista_id is null);

  -- Se mantiene por compatibilidad con pantallas actuales; la decisión
  -- real de doble voto vive en votantes UNIQUE(eleccion_id,estudiante_id).
  update estudiantes set ha_votado=true where id=v_estudiante.id;
  return json_build_object('ok',true,'mensaje','Voto registrado correctamente.');
end;
$$;
revoke all on function fn_emitir_voto(text,bigint) from public;
grant execute on function fn_emitir_voto(text,bigint) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. LIMPIEZA AUTOMÁTICA DE INTENTOS ANTIGUOS
-- ---------------------------------------------------------------------
create or replace function fn_limpiar_intentos_antiguos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  delete from intentos_fallidos_voto where created_at < now() - interval '2 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function fn_limpiar_intentos_antiguos() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname='limpiar-intentos-fallidos';
select cron.schedule('limpiar-intentos-fallidos','0 * * * *',$$select public.fn_limpiar_intentos_antiguos();$$);

-- =====================================================================
-- FIN
-- =====================================================================
