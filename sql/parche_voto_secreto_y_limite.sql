-- =====================================================================
-- PARCHE: VOTO SECRETO REFORZADO + LÍMITE DE INTENTOS REALISTA
-- =====================================================================
-- Ejecutar UNA vez en Supabase -> SQL Editor, DESPUÉS de schema.sql (o
-- migracion_multi_anio.sql) y mejoras_seguridad.sql. Es seguro volver a
-- ejecutarlo: no rompe nada si se corre dos veces.
--
-- IMPORTANTE: ejecútalo ANTES de la jornada electoral (no con la
-- votación abierta), porque reordena la tabla de votos.
--
-- QUÉ ARREGLA
--
-- 1. Cruce voto <-> votante. Hasta ahora "votos" y "votantes" se
--    insertaban en la misma operación, con la MISMA fecha_hora exacta y
--    con identificadores correlativos. Quien tuviera acceso directo a la
--    base podía emparejarlos y saber quién votó por quién. Ahora:
--      - votos.fecha_hora se elimina (ninguna pantalla ni función la
--        usa; la hora en que votó cada alumno sigue en votantes).
--      - votos.id pasa a ser un número aleatorio, no correlativo.
--      - los votos ya existentes se renumeran y se reordenan al azar.
--    Los resultados, actas, gráficos y el control de doble voto
--    siguen funcionando exactamente igual.
--
-- 2. Límite de intentos fallidos por IP (consulta de DNI). Estaba
--    programado pero NUNCA llegaba a funcionar: cada intento fallido se
--    anotaba y justo después la función lanzaba un error, y ese error
--    deshacía también la anotación. Resultado: la tabla de intentos
--    siempre quedaba vacía y el límite no frenaba a nadie. Ahora, si el
--    DNI no existe, la consulta devuelve un resultado vacío (sin lanzar
--    error), el intento queda guardado y el límite sí cuenta.
--    Como todo el colegio sale con la misma IP, el tope es generoso:
--    100 consultas fallidas cada 10 minutos (los votantes reales que
--    consultan bien NO cuentan). Si se supera, se libera solo a los 10
--    minutos. Requiere también el cambio en js/paginas/votar/paso-dni.js
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. VOTO SECRETO
-- ---------------------------------------------------------------------

-- 1a. Generador de identificadores aleatorios (60 bits, criptográfico
--     porque sale de gen_random_uuid()).
create or replace function fn_id_voto_aleatorio()
returns bigint
language sql
volatile
as $$
  select ('x' || left(replace(gen_random_uuid()::text, '-', ''), 15))::bit(60)::bigint;
$$;

-- 1b. Quitar la hora exacta del voto.
alter table votos drop column if exists fecha_hora;

-- 1c. El id deja de ser correlativo.
alter table votos alter column id drop identity if exists;
alter table votos alter column id set default fn_id_voto_aleatorio();

-- 1d. Renumerar al azar los votos que ya existan (pruebas anteriores).
update votos set id = fn_id_voto_aleatorio();

-- 1e. Reordenar físicamente la tabla según ese id aleatorio, para que
--     el orden en disco tampoco delate el orden de llegada.
cluster votos using votos_pkey;


-- ---------------------------------------------------------------------
-- 2. LÍMITE DE INTENTOS FALLIDOS
-- ---------------------------------------------------------------------

-- 2a. Topes: 100 consultas / 40 votos fallidos cada 10 minutos por IP.
create or replace function fn_verificar_limite_intentos(p_tipo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip text := fn_obtener_ip_cliente();
  v_max integer := case p_tipo when 'consulta' then 100 when 'voto' then 40 else 50 end;
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

-- 2b. fn_consultar_estudiante: idéntica a la de mejoras_seguridad.sql,
--     salvo que en los dos casos de intento fallido (DNI mal formado o
--     inexistente) ahora hace "return" en vez de lanzar un error, para
--     que el registro del intento no se deshaga.
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
  perform fn_verificar_limite_intentos('consulta');

  if v_dni !~ '^[0-9]{8}$' then
    perform fn_registrar_intento_fallido('consulta');
    return;  -- resultado vacío: la pantalla avisa que el DNI no es válido
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
    perform fn_registrar_intento_fallido('consulta');
    return;  -- resultado vacío: la pantalla avisa que el DNI no figura
  end if;
end;
$$;
revoke all on function fn_consultar_estudiante(text) from public;
grant execute on function fn_consultar_estudiante(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- VERIFICACIÓN (opcional): ejecuta esto por separado después del parche
-- ---------------------------------------------------------------------
-- a) La tabla votos NO debe tener fecha_hora ni estudiante_id:
--      select column_name from information_schema.columns
--      where table_schema='public' and table_name='votos' order by ordinal_position;
--    Esperado: id, eleccion_id, mesa_id, lista_id, es_blanco
--
-- b) Los ids deben verse como números grandes y desordenados:
--      select id, mesa_id, es_blanco from votos limit 10;
--
-- c) Los resultados no deben haber cambiado:
--      select count(*) from votos;
--
-- d) Tras consultar varias veces un DNI inexistente desde la pantalla de
--    votación, deben aparecer filas aquí (antes siempre estaba vacía):
--      select * from intentos_fallidos_voto order by id desc limit 10;
--
-- PASO FINAL OBLIGATORIO: cuando CIERRES la votación (después de la
-- jornada, no antes), ejecuta esta línea para reordenar al azar los
-- votos recibidos ese día. Los votos nuevos se guardan en orden de
-- llegada hasta que se hace esto:
--      cluster votos using votos_pkey;
-- =====================================================================
