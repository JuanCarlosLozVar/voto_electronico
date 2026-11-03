-- =====================================================================
-- MIGRACIÓN SEGURA - VERSIÓN ACTUAL DEL SISTEMA
-- Ejecutar en Supabase sobre tu proyecto EXISTENTE.
-- NO borra padrón, mesas, listas, candidatos, votos ni elecciones.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------------------
-- 1. MULTI-ELECCIÓN: asegurar eleccion_id y restricciones correctas
-- ---------------------------------------------------------------------
alter table votos add column if not exists eleccion_id bigint;
alter table listas add column if not exists eleccion_id bigint;

update votos
set eleccion_id = (select id from eleccion order by id asc limit 1)
where eleccion_id is null;
update listas
set eleccion_id = (select id from eleccion order by id asc limit 1)
where eleccion_id is null;

alter table votos alter column eleccion_id set not null;
alter table listas alter column eleccion_id set not null;

-- Votos en blanco: en el diseño original "lista_id" era obligatorio.
-- Ahora un voto en blanco se guarda con lista_id = NULL y es_blanco = true.
alter table votos add column if not exists es_blanco boolean not null default false;
alter table votos alter column lista_id drop not null;
alter table votos drop constraint if exists votos_blanco_coherente;
alter table votos add constraint votos_blanco_coherente check ((lista_id is null) = es_blanco);

create table if not exists votantes (
  id bigint generated always as identity primary key,
  eleccion_id bigint not null,
  estudiante_id bigint not null,
  fecha_hora timestamptz not null default now(),
  unique(eleccion_id,estudiante_id)
);
create index if not exists idx_votantes_eleccion on votantes(eleccion_id);

-- El número de lista es único DENTRO de cada elección, no globalmente.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid='public.listas'::regclass
      and c.contype='u'
      and pg_get_constraintdef(c.oid) in ('UNIQUE (numero)','UNIQUE (numero) DEFERRABLE')
  loop
    execute format('alter table public.listas drop constraint %I',r.conname);
  end loop;
end $$;
create unique index if not exists ux_listas_eleccion_numero on listas(eleccion_id,numero);
create index if not exists idx_votos_eleccion on votos(eleccion_id);
create index if not exists idx_listas_eleccion on listas(eleccion_id);

create unique index if not exists ux_una_eleccion_abierta on eleccion(estado) where estado='abierta';

-- ---------------------------------------------------------------------
-- 2. PROTEGER HISTORIAL: quitar ON DELETE CASCADE de relaciones de votos
-- ---------------------------------------------------------------------
alter table votos drop constraint if exists votos_eleccion_id_fkey;
alter table votos drop constraint if exists votos_lista_id_fkey;
alter table votos drop constraint if exists votos_mesa_id_fkey;
alter table votantes drop constraint if exists votantes_eleccion_id_fkey;
alter table votantes drop constraint if exists votantes_estudiante_id_fkey;

alter table votos
  add constraint votos_eleccion_id_fkey foreign key(eleccion_id) references eleccion(id) on delete restrict;
alter table votos
  add constraint votos_lista_id_fkey foreign key(lista_id) references listas(id) on delete restrict;
alter table votos
  add constraint votos_mesa_id_fkey foreign key(mesa_id) references mesas(id) on delete restrict;
alter table votantes
  add constraint votantes_eleccion_id_fkey foreign key(eleccion_id) references eleccion(id) on delete restrict;
alter table votantes
  add constraint votantes_estudiante_id_fkey foreign key(estudiante_id) references estudiantes(id) on delete restrict;

alter table candidatos add column if not exists eleccion_id bigint;
update candidatos c set eleccion_id=(select l.eleccion_id from listas l where l.id=c.lista_id) where c.eleccion_id is null;
alter table candidatos alter column eleccion_id set not null;
alter table candidatos add column if not exists estudiante_id bigint references estudiantes(id) on delete set null;
alter table candidatos drop constraint if exists candidatos_estudiante_id_key;
alter table candidatos drop constraint if exists candidatos_eleccion_id_estudiante_id_key;
alter table candidatos drop constraint if exists candidatos_eleccion_id_fkey;
alter table candidatos add constraint candidatos_eleccion_id_fkey foreign key(eleccion_id) references eleccion(id) on delete restrict;
create unique index if not exists ux_candidatos_eleccion_estudiante on candidatos(eleccion_id,estudiante_id);

-- ---------------------------------------------------------------------
-- 3. PERFILES, DIRECTIVOS E INVITACIONES
-- ---------------------------------------------------------------------
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  rol text not null check (rol in ('admin','directivo')),
  subrol text check (subrol in ('director','subdirector')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint perfil_subrol_coherente check ((rol='admin' and subrol is null) or (rol='directivo' and subrol is not null))
);
create unique index if not exists ux_perfiles_email on perfiles(lower(email));

create table if not exists directivo_invitaciones (
  id bigint generated always as identity primary key,
  email text not null,
  subrol text not null check (subrol in ('director','subdirector')),
  token_hash text not null unique,
  estado text not null default 'pendiente' check (estado in ('pendiente','usada','revocada','expirada')),
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  used_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create unique index if not exists ux_invitacion_pendiente_email on directivo_invitaciones(lower(email)) where estado='pendiente';

create or replace function fn_validar_candidato_eleccion()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if not exists(select 1 from listas l where l.id=new.lista_id and l.eleccion_id=new.eleccion_id) then
    raise exception 'El candidato y la lista deben pertenecer a la misma elección.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_validar_candidato_eleccion on candidatos;
create trigger trg_validar_candidato_eleccion
before insert or update on candidatos
for each row execute function fn_validar_candidato_eleccion();

-- ---------------------------------------------------------------------
-- 4. EVENTOS DE RESULTADOS PARA REALTIME
-- ---------------------------------------------------------------------
create table if not exists eventos_resultado (
  id bigint generated always as identity primary key,
  eleccion_id bigint not null references eleccion(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists idx_eventos_resultado_eleccion on eventos_resultado(eleccion_id,created_at desc);

create or replace function fn_registrar_evento_resultado()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into eventos_resultado(eleccion_id) values(new.eleccion_id);
  return new;
end;
$$;
drop trigger if exists trg_voto_evento_resultado on votos;
create trigger trg_voto_evento_resultado after insert on votos for each row execute function fn_registrar_evento_resultado();

-- ---------------------------------------------------------------------
-- 5. FUNCIONES DE ROLES
-- ---------------------------------------------------------------------
create or replace function fn_tiene_rol(p_rol text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from perfiles where id=auth.uid() and rol=p_rol and activo=true);
$$;
create or replace function fn_es_admin()
returns boolean language sql stable security definer set search_path=public as $$ select fn_tiene_rol('admin'); $$;
create or replace function fn_es_directivo()
returns boolean language sql stable security definer set search_path=public as $$ select fn_tiene_rol('directivo'); $$;
create or replace function fn_es_personal_resultados()
returns boolean language sql stable security definer set search_path=public as $$ select fn_es_admin() or fn_es_directivo(); $$;

create or replace function fn_configurar_admin_por_email(p_email text)
returns void language plpgsql security definer set search_path=public as $$
declare v_user auth.users%rowtype;
begin
  select * into v_user from auth.users where lower(email)=lower(trim(p_email)) limit 1;
  if not found then raise exception 'No existe un usuario Auth con ese correo.'; end if;
  insert into perfiles(id,email,rol,subrol,activo)
  values(v_user.id,coalesce(v_user.email,p_email),'admin',null,true)
  on conflict(id) do update set email=excluded.email,rol='admin',subrol=null,activo=true,updated_at=now();
end;
$$;
revoke all on function fn_configurar_admin_por_email(text) from public,anon,authenticated;

-- ---------------------------------------------------------------------
-- 6. RLS: reemplazar las políticas antiguas que trataban a TODO
-- authenticated como administrador.
-- ---------------------------------------------------------------------
alter table perfiles enable row level security;
alter table directivo_invitaciones enable row level security;
alter table eventos_resultado enable row level security;

-- tablas antiguas
alter table colegio enable row level security;
alter table eleccion enable row level security;
alter table mesas enable row level security;
alter table estudiantes enable row level security;
alter table miembros_mesa enable row level security;
alter table listas enable row level security;
alter table candidatos enable row level security;
alter table votos enable row level security;
alter table votantes enable row level security;

-- Eliminar políticas anteriores conocidas.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('colegio','eleccion','mesas','estudiantes','miembros_mesa','listas','candidatos','votos','votantes','perfiles','directivo_invitaciones','eventos_resultado')
  loop
    execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename);
  end loop;
end $$;

create policy "colegio_admin_all" on colegio for all using(fn_es_admin()) with check(fn_es_admin());
create policy "colegio_public_select" on colegio for select using(true);

create policy "eleccion_admin_select" on eleccion for select using(fn_es_admin());
create policy "eleccion_admin_insert" on eleccion for insert with check(fn_es_admin() and estado='configuracion');
create policy "eleccion_admin_update" on eleccion for update using(
  fn_es_admin() and (estado='configuracion' or (estado='cerrada' and not exists(select 1 from votos v where v.eleccion_id=eleccion.id)))
) with check(
  fn_es_admin() and (estado='configuracion' or (estado='cerrada' and not exists(select 1 from votos v where v.eleccion_id=eleccion.id)))
);
create policy "eleccion_admin_delete" on eleccion for delete using(
  fn_es_admin() and not exists(select 1 from votos v where v.eleccion_id=eleccion.id) and not exists(select 1 from votantes vt where vt.eleccion_id=eleccion.id) and not exists(select 1 from listas l where l.eleccion_id=eleccion.id)
);
create policy "eleccion_public_select" on eleccion for select using(true);
create policy "eleccion_directivo_select" on eleccion for select using(fn_es_directivo());

create policy "mesas_admin_select" on mesas for select using(fn_es_admin());
create policy "mesas_admin_insert" on mesas for insert with check(fn_es_admin());
create policy "mesas_admin_update" on mesas for update using(fn_es_admin() and not exists(select 1 from votos v where v.mesa_id=mesas.id)) with check(fn_es_admin() and not exists(select 1 from votos v where v.mesa_id=mesas.id));
create policy "mesas_admin_delete" on mesas for delete using(fn_es_admin() and not exists(select 1 from votos v where v.mesa_id=mesas.id));
create policy "estudiantes_admin_all" on estudiantes for all using(fn_es_admin()) with check(fn_es_admin());
create policy "miembros_mesa_admin_all" on miembros_mesa for all using(fn_es_admin()) with check(fn_es_admin());

create policy "listas_admin_select" on listas for select using(fn_es_admin());
create policy "listas_admin_insert" on listas for insert with check(
  fn_es_admin() and
  exists(select 1 from eleccion e where e.id=eleccion_id and e.estado<>'abierta') and
  not exists(select 1 from votos v where v.eleccion_id=listas.eleccion_id)
);
create policy "listas_admin_update" on listas for update using(
  fn_es_admin() and
  exists(select 1 from eleccion e where e.id=listas.eleccion_id and e.estado<>'abierta') and
  not exists(select 1 from votos v where v.eleccion_id=listas.eleccion_id)
) with check(
  fn_es_admin() and
  exists(select 1 from eleccion e where e.id=listas.eleccion_id and e.estado<>'abierta') and
  not exists(select 1 from votos v where v.eleccion_id=listas.eleccion_id)
);
create policy "listas_admin_delete" on listas for delete using(fn_es_admin() and not exists(select 1 from votos v where v.lista_id=listas.id));
create policy "listas_public_select" on listas for select using(activa=true);
create policy "listas_directivo_select" on listas for select using(fn_es_directivo());

create policy "candidatos_admin_select" on candidatos for select using (fn_es_admin());
create policy "candidatos_admin_insert" on candidatos for insert with check (
  fn_es_admin() and exists(select 1 from listas l join eleccion e on e.id=l.eleccion_id where l.id=lista_id and e.estado<>'abierta')
  and not exists(select 1 from votos v join listas l2 on l2.id=v.lista_id where l2.eleccion_id=(select eleccion_id from listas where id=lista_id))
);
create policy "candidatos_admin_update" on candidatos for update using (
  fn_es_admin() and exists(select 1 from listas l join eleccion e on e.id=l.eleccion_id where l.id=candidatos.lista_id and e.estado<>'abierta')
  and not exists(select 1 from votos v join listas l2 on l2.id=v.lista_id where l2.eleccion_id=(select eleccion_id from listas where id=candidatos.lista_id))
) with check (fn_es_admin());
create policy "candidatos_admin_delete" on candidatos for delete using (
  fn_es_admin() and not exists(select 1 from votos v join listas l2 on l2.id=v.lista_id where l2.eleccion_id=(select eleccion_id from listas where id=candidatos.lista_id))
);
create policy "candidatos_public_select" on candidatos for select using(exists(select 1 from listas l where l.id=candidatos.lista_id and l.activa=true));
create policy "candidatos_directivo_select" on candidatos for select using(fn_es_directivo());

create policy "votos_admin_select" on votos for select using(fn_es_admin());
create policy "votantes_admin_select" on votantes for select using(fn_es_admin());
create policy "perfiles_self_select" on perfiles for select using(id=auth.uid());
create policy "perfiles_admin_all" on perfiles for all using(fn_es_admin()) with check(fn_es_admin());
create policy "invitaciones_admin_all" on directivo_invitaciones for all using(fn_es_admin()) with check(fn_es_admin());
create policy "eventos_resultado_personal_select" on eventos_resultado for select using(fn_es_personal_resultados());

-- ---------------------------------------------------------------------
-- 7. CIERRE AUTOMÁTICO + VALIDACIÓN DE HORA EN SERVIDOR
-- ---------------------------------------------------------------------
create or replace function fn_cerrar_elecciones_vencidas()
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  update eleccion e set estado='cerrada'
  where e.estado='abierta'
    and now() >= ((e.fecha+e.hora_fin) at time zone 'America/Lima'
      + case when e.hora_fin<=e.hora_inicio then interval '1 day' else interval '0 day' end);
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;
revoke all on function fn_cerrar_elecciones_vencidas() from public,anon,authenticated;

-- Apertura automática: la contraparte de fn_cerrar_elecciones_vencidas().
-- Abre una elección que sigue en "configuracion" en cuanto se cumple su
-- hora de inicio programada, siempre que ninguna otra esté abierta ya
-- (respeta la restricción "solo una elección abierta a la vez") y que
-- su ventana de votación no haya quedado vencida sin que nadie la abriera.
create or replace function fn_abrir_elecciones_programadas()
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  update eleccion e set estado='abierta'
  where e.estado='configuracion'
    and now() >= ((e.fecha+e.hora_inicio) at time zone 'America/Lima')
    and now() < ((e.fecha+e.hora_fin) at time zone 'America/Lima'
      + case when e.hora_fin<=e.hora_inicio then interval '1 day' else interval '0 day' end)
    and not exists (select 1 from eleccion e2 where e2.estado='abierta');
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;
revoke all on function fn_abrir_elecciones_programadas() from public,anon,authenticated;

create or replace function fn_abrir_eleccion(p_eleccion_id bigint)
returns void language plpgsql security definer set search_path=public as $$
declare v_eleccion eleccion%rowtype;
begin
  if not fn_es_admin() then raise exception 'No tienes permisos para abrir la elección.'; end if;
  select * into v_eleccion from eleccion where id=p_eleccion_id for update;
  if not found then raise exception 'La elección no existe.'; end if;
  if v_eleccion.estado='abierta' then raise exception 'La elección ya está abierta.'; end if;
  if v_eleccion.estado='cerrada' then raise exception 'La elección ya fue cerrada y no puede reabrirse.'; end if;
  if now() >= ((v_eleccion.fecha + v_eleccion.hora_fin) at time zone 'America/Lima'
      + case when v_eleccion.hora_fin <= v_eleccion.hora_inicio then interval '1 day' else interval '0 day' end)
  then raise exception 'La hora final de esta elección ya pasó. Crea/configura una nueva jornada.'; end if;
  update eleccion set estado='abierta' where id=p_eleccion_id;
end;
$$;
revoke all on function fn_abrir_eleccion(bigint) from public,anon;
grant execute on function fn_abrir_eleccion(bigint) to authenticated;

create or replace function fn_cerrar_eleccion(p_eleccion_id bigint)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not fn_es_admin() then raise exception 'No tienes permisos para cerrar la elección.'; end if;
  update eleccion set estado='cerrada' where id=p_eleccion_id and estado='abierta';
  if not found then raise exception 'La elección no está abierta o no existe.'; end if;
end;
$$;
revoke all on function fn_cerrar_eleccion(bigint) from public,anon;
grant execute on function fn_cerrar_eleccion(bigint) to authenticated;

create or replace function fn_consultar_estudiante(p_dni text)
returns table(estudiante_id bigint,nombres text,apellidos text,grado text,seccion text,mesa_id bigint,mesa_nombre text,ha_votado boolean)
language plpgsql security definer set search_path=public as $$
declare v_eleccion eleccion%rowtype; v_inicio timestamptz; v_fin timestamptz; v_dni text:=regexp_replace(coalesce(p_dni,''),'\s+','','g');
begin
  if v_dni !~ '^[0-9]{8}$' then raise exception 'Ingresa un DNI válido de 8 dígitos.'; end if;
  select * into v_eleccion from eleccion order by id desc limit 1;
  if not found then raise exception 'No hay una elección configurada.'; end if;
  v_inicio:=(v_eleccion.fecha+v_eleccion.hora_inicio) at time zone 'America/Lima';
  v_fin:=(v_eleccion.fecha+v_eleccion.hora_fin) at time zone 'America/Lima';
  if v_eleccion.hora_fin<=v_eleccion.hora_inicio then v_fin:=v_fin+interval '1 day'; end if;
  if v_eleccion.estado<>'abierta' then raise exception 'La elección no está abierta en este momento.'; end if;
  if now()<v_inicio then raise exception 'La votación todavía no ha comenzado.'; end if;
  if now()>=v_fin then update eleccion set estado='cerrada' where id=v_eleccion.id and estado='abierta'; raise exception 'La votación ya terminó.'; end if;
  return query select e.id,e.nombres,e.apellidos,e.grado,e.seccion,m.id,m.nombre,
    exists(select 1 from votantes v where v.eleccion_id=v_eleccion.id and v.estudiante_id=e.id)
    from estudiantes e left join mesas m on m.id=e.mesa_id where e.dni=v_dni;
  if not found then raise exception 'El DNI ingresado no figura en el padrón electoral.'; end if;
end;
$$;
revoke all on function fn_consultar_estudiante(text) from public;
grant execute on function fn_consultar_estudiante(text) to anon,authenticated;

create or replace function fn_emitir_voto(p_dni text,p_lista_id bigint default null)
returns json language plpgsql security definer set search_path=public as $$
declare v_eleccion eleccion%rowtype; v_inicio timestamptz; v_fin timestamptz; v_estudiante estudiantes%rowtype; v_lista_ok boolean; v_insertado bigint; v_dni text:=regexp_replace(coalesce(p_dni,''),'\s+','','g');
begin
  if v_dni !~ '^[0-9]{8}$' then raise exception 'Ingresa un DNI válido de 8 dígitos.'; end if;
  select * into v_eleccion from eleccion order by id desc limit 1;
  if not found then raise exception 'No hay una elección configurada.'; end if;
  v_inicio:=(v_eleccion.fecha+v_eleccion.hora_inicio) at time zone 'America/Lima';
  v_fin:=(v_eleccion.fecha+v_eleccion.hora_fin) at time zone 'America/Lima';
  if v_eleccion.hora_fin<=v_eleccion.hora_inicio then v_fin:=v_fin+interval '1 day'; end if;
  if v_eleccion.estado<>'abierta' then raise exception 'La elección no está abierta en este momento.'; end if;
  if now()<v_inicio then raise exception 'La votación todavía no ha comenzado.'; end if;
  if now()>=v_fin then update eleccion set estado='cerrada' where id=v_eleccion.id and estado='abierta'; raise exception 'La votación ya terminó.'; end if;
  select * into v_estudiante from estudiantes where dni=v_dni for update;
  if not found then raise exception 'El DNI ingresado no figura en el padrón electoral.'; end if;
  if v_estudiante.mesa_id is null then raise exception 'El estudiante no tiene una mesa asignada.'; end if;
  if p_lista_id is not null then
    select exists(select 1 from listas where id=p_lista_id and activa=true and eleccion_id=v_eleccion.id) into v_lista_ok;
    if not v_lista_ok then raise exception 'La lista seleccionada no es válida para esta elección.'; end if;
  end if;
  insert into votantes(eleccion_id,estudiante_id) values(v_eleccion.id,v_estudiante.id) on conflict(eleccion_id,estudiante_id) do nothing returning id into v_insertado;
  if v_insertado is null then raise exception 'Este estudiante ya emitió su voto.'; end if;
  insert into votos(eleccion_id,mesa_id,lista_id,es_blanco) values(v_eleccion.id,v_estudiante.mesa_id,p_lista_id,p_lista_id is null);
  update estudiantes set ha_votado=true where id=v_estudiante.id;
  return json_build_object('ok',true,'mensaje','Voto registrado correctamente.');
end;
$$;
revoke all on function fn_emitir_voto(text,bigint) from public;
grant execute on function fn_emitir_voto(text,bigint) to anon,authenticated;

create or replace function fn_obtener_estado_eleccion_publico()
returns table(
  id bigint,nombre text,fecha date,hora_inicio time,hora_fin time,estado text,
  inicio_at timestamptz,fin_at timestamptz,ahora_at timestamptz
)
language plpgsql
security definer
set search_path=public
as $$
declare v_eleccion eleccion%rowtype; v_inicio timestamptz; v_fin timestamptz; v_now timestamptz:=now();
begin
  select * into v_eleccion from eleccion order by id desc limit 1;
  if not found then return; end if;
  v_inicio:=(v_eleccion.fecha+v_eleccion.hora_inicio) at time zone 'America/Lima';
  v_fin:=(v_eleccion.fecha+v_eleccion.hora_fin) at time zone 'America/Lima';
  if v_eleccion.hora_fin<=v_eleccion.hora_inicio then v_fin:=v_fin+interval '1 day'; end if;
  if v_eleccion.estado='abierta' and v_now>=v_fin then
    update eleccion set estado='cerrada' where id=v_eleccion.id and eleccion.estado='abierta';
    v_eleccion.estado:='cerrada';
  end if;
  return query select v_eleccion.id,v_eleccion.nombre,v_eleccion.fecha,v_eleccion.hora_inicio,v_eleccion.hora_fin,v_eleccion.estado,v_inicio,v_fin,v_now;
end;
$$;
revoke all on function fn_obtener_estado_eleccion_publico() from public;
grant execute on function fn_obtener_estado_eleccion_publico() to anon,authenticated;

-- ---------------------------------------------------------------------
-- 8. INVITACIONES DIRECTIVAS
-- ---------------------------------------------------------------------
create or replace function fn_crear_invitacion_directivo(p_email text,p_subrol text,p_dias integer default 7)
returns table(token text,email text,subrol text,expires_at timestamptz)
language plpgsql security definer set search_path=public,extensions as $$
declare v_token text; v_expires timestamptz; v_email text:=lower(trim(p_email));
begin
  if not fn_es_admin() then raise exception 'Solo un administrador puede crear invitaciones.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Ingresa un correo válido.'; end if;
  if p_subrol not in ('director','subdirector') then raise exception 'El rol directivo debe ser director o subdirector.'; end if;
  if p_dias<1 or p_dias>30 then raise exception 'La invitación puede durar entre 1 y 30 días.'; end if;
  if exists(select 1 from perfiles where lower(perfiles.email)=v_email and perfiles.activo=true) then raise exception 'Ese usuario ya tiene un perfil activo.'; end if;
  update directivo_invitaciones set estado='revocada' where lower(directivo_invitaciones.email)=v_email and directivo_invitaciones.estado='pendiente';
  v_token:=encode(gen_random_bytes(24),'hex'); v_expires:=now()+make_interval(days=>p_dias);
  insert into directivo_invitaciones(email,subrol,token_hash,expires_at,created_by) values(v_email,p_subrol,encode(digest(v_token,'sha256'),'hex'),v_expires,auth.uid());
  return query select v_token,v_email,p_subrol,v_expires;
end;
$$;
revoke all on function fn_crear_invitacion_directivo(text,text,integer) from public,anon;
grant execute on function fn_crear_invitacion_directivo(text,text,integer) to authenticated;

create or replace function fn_activar_invitacion_directivo(p_token text)
returns json language plpgsql security definer set search_path=public,extensions as $$
declare v_inv directivo_invitaciones%rowtype; v_email text; v_user_id uuid:=auth.uid();
begin
  if v_user_id is null then raise exception 'Debes iniciar sesión para activar la invitación.'; end if;
  select lower(email) into v_email from auth.users where id=v_user_id;
  select * into v_inv from directivo_invitaciones where token_hash=encode(digest(trim(p_token),'sha256'),'hex') order by id desc limit 1 for update;
  if not found then raise exception 'La invitación no es válida.'; end if;
  if v_inv.estado<>'pendiente' then raise exception 'La invitación ya fue usada, revocada o cerrada.'; end if;
  if v_inv.expires_at<=now() then update directivo_invitaciones set estado='expirada' where id=v_inv.id; raise exception 'La invitación ha expirado.'; end if;
  if v_email is null or lower(v_inv.email)<>v_email then raise exception 'El correo de la cuenta no coincide con el correo invitado.'; end if;
  insert into perfiles(id,email,rol,subrol,activo) values(v_user_id,v_email,'directivo',v_inv.subrol,true)
    on conflict(id) do update set email=excluded.email,rol='directivo',subrol=excluded.subrol,activo=true,updated_at=now();
  update directivo_invitaciones set estado='usada',used_by=v_user_id,used_at=now() where id=v_inv.id;
  return json_build_object('ok',true,'rol','directivo','subrol',v_inv.subrol,'mensaje','Cuenta directiva activada correctamente.');
end;
$$;
revoke all on function fn_activar_invitacion_directivo(text) from public,anon;
grant execute on function fn_activar_invitacion_directivo(text) to authenticated;

-- ---------------------------------------------------------------------
-- 9. RESULTADOS PARA ADMIN Y DIRECTIVO (SIN EXPONER VOTOS CRUD)
-- ---------------------------------------------------------------------
create or replace function fn_resultados_generales(p_eleccion_id bigint)
returns table(eleccion_id bigint,lista_id bigint,numero integer,nombre text,total_votos bigint,porcentaje numeric)
language plpgsql security definer set search_path=public as $$
begin
  if not fn_es_personal_resultados() then raise exception 'No tienes permiso para consultar resultados.'; end if;
  return query select l.eleccion_id,l.id,l.numero,l.nombre,count(v.id)::bigint,
    round(100.0*count(v.id)/nullif((select count(*) from votos vx where vx.eleccion_id=l.eleccion_id),0),2)
    from listas l left join votos v on v.lista_id=l.id and v.eleccion_id=l.eleccion_id
    where l.eleccion_id=p_eleccion_id group by l.eleccion_id,l.id,l.numero,l.nombre order by count(v.id) desc,l.numero;
end;
$$;
revoke all on function fn_resultados_generales(bigint) from public,anon;
grant execute on function fn_resultados_generales(bigint) to authenticated;

create or replace function fn_resultados_por_mesa(p_eleccion_id bigint)
returns table(mesa_id bigint,mesa_numero integer,mesa_nombre text,eleccion_id bigint,lista_id bigint,lista_nombre text,total_votos bigint)
language plpgsql security definer set search_path=public as $$
begin
  if not fn_es_personal_resultados() then raise exception 'No tienes permiso para consultar resultados.'; end if;
  return query select m.id,m.numero,m.nombre,l.eleccion_id,l.id,l.nombre,count(v.id)::bigint
    from mesas m cross join listas l left join votos v on v.mesa_id=m.id and v.lista_id=l.id and v.eleccion_id=p_eleccion_id
    where l.eleccion_id=p_eleccion_id group by m.id,m.numero,m.nombre,l.eleccion_id,l.id,l.nombre order by m.numero,l.numero;
end;
$$;
revoke all on function fn_resultados_por_mesa(bigint) from public,anon;
grant execute on function fn_resultados_por_mesa(bigint) to authenticated;

create or replace function fn_resumen_resultados(p_eleccion_id bigint)
returns table(total_votos bigint,votos_blanco bigint,total_emitidos bigint)
language plpgsql security definer set search_path=public as $$
begin
  if not fn_es_personal_resultados() then raise exception 'No tienes permiso para consultar resultados.'; end if;
  return query select count(*) filter(where not es_blanco)::bigint,count(*) filter(where es_blanco)::bigint,count(*)::bigint from votos where eleccion_id=p_eleccion_id;
end;
$$;
revoke all on function fn_resumen_resultados(bigint) from public,anon;
grant execute on function fn_resumen_resultados(bigint) to authenticated;

create or replace function fn_votos_blanco_por_mesa(p_eleccion_id bigint)
returns table(mesa_id bigint,votos_blanco bigint)
language plpgsql
security definer
set search_path=public
as $$
begin
  if not fn_es_personal_resultados() then raise exception 'No tienes permiso para consultar resultados.'; end if;
  return query
  select m.id,count(v.id)::bigint
  from mesas m
  left join votos v on v.mesa_id=m.id and v.eleccion_id=p_eleccion_id and v.es_blanco=true
  group by m.id
  order by m.id;
end;
$$;
revoke all on function fn_votos_blanco_por_mesa(bigint) from public,anon;
grant execute on function fn_votos_blanco_por_mesa(bigint) to authenticated;

-- Mantener las vistas actuales para mesas.html, que solo es accesible al admin.
drop view if exists vw_resultados_generales cascade;
drop view if exists vw_resultados_por_mesa cascade;
create view vw_resultados_generales with (security_invoker=true) as
select l.eleccion_id,l.id as lista_id,l.numero,l.nombre,count(v.id)::bigint as total_votos,
  round(100.0*count(v.id)/nullif((select count(*) from votos vx where vx.eleccion_id=l.eleccion_id),0),2) as porcentaje
from listas l left join votos v on v.lista_id=l.id and v.eleccion_id=l.eleccion_id
group by l.eleccion_id,l.id,l.numero,l.nombre;
create view vw_resultados_por_mesa with (security_invoker=true) as
select m.id as mesa_id,m.numero as mesa_numero,m.nombre as mesa_nombre,l.eleccion_id,l.id as lista_id,l.nombre as lista_nombre,count(v.id)::bigint as total_votos
from mesas m cross join listas l left join votos v on v.mesa_id=m.id and v.lista_id=l.id and v.eleccion_id=l.eleccion_id
group by m.id,m.numero,m.nombre,l.eleccion_id,l.id,l.nombre;
grant select on vw_resultados_generales,vw_resultados_por_mesa to authenticated;

-- ---------------------------------------------------------------------
-- 10. CRON Y REALTIME
-- ---------------------------------------------------------------------
do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='eventos_resultado') then
    alter publication supabase_realtime add table public.eventos_resultado;
  end if;
exception when undefined_object then
  raise notice 'Activa supabase_realtime en Database -> Replication y vuelve a ejecutar este bloque.';
end $$;
select cron.unschedule(jobid) from cron.job where jobname='cerrar-elecciones-vencidas';
select cron.schedule('cerrar-elecciones-vencidas','* * * * *',$$select public.fn_cerrar_elecciones_vencidas();$$);
select cron.unschedule(jobid) from cron.job where jobname='abrir-elecciones-programadas';
select cron.schedule('abrir-elecciones-programadas','* * * * *',$$select public.fn_abrir_elecciones_programadas();$$);

-- ---------------------------------------------------------------------
-- 11. VINCULAR EL ADMIN EXISTENTE
-- ---------------------------------------------------------------------
-- Después de ejecutar esta migración, ejecuta UNA VEZ en SQL Editor:
-- select fn_configurar_admin_por_email('CORREO_DEL_ADMIN_QUE_YA_EXISTE');
-- Esto NO crea otro usuario Auth; solo asigna el rol admin al usuario existente.

-- =====================================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================================