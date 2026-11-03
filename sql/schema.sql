-- =====================================================================
-- SISTEMA DE VOTO ELECTRÓNICO - MUNICIPIO ESCOLAR
-- ESQUEMA COMPLETO Y SEGURO PARA SUPABASE
-- =====================================================================
-- IMPORTANTE: este archivo crea el proyecto desde cero y contiene DROP al
-- inicio. Si ya tienes datos en Supabase, NO lo ejecutes: usa
-- migracion_multi_anio.sql.

create extension if not exists pgcrypto;
create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------------------
-- 0. LIMPIEZA SOLO PARA INSTALACIÓN NUEVA
-- ---------------------------------------------------------------------
drop view if exists vw_resultados_generales cascade;
drop view if exists vw_resultados_por_mesa cascade;
drop view if exists vw_resultados_resumen cascade;
drop function if exists fn_consultar_estudiante(text) cascade;
drop function if exists fn_emitir_voto(text, bigint) cascade;
drop function if exists fn_abrir_eleccion(bigint) cascade;
drop function if exists fn_cerrar_eleccion(bigint) cascade;
drop function if exists fn_cerrar_elecciones_vencidas() cascade;
drop function if exists fn_resultados_generales(bigint) cascade;
drop function if exists fn_resultados_por_mesa(bigint) cascade;
drop function if exists fn_resumen_resultados(bigint) cascade;
drop function if exists fn_votos_blanco_por_mesa(bigint) cascade;
drop function if exists fn_crear_invitacion_directivo(text, text, integer) cascade;
drop function if exists fn_activar_invitacion_directivo(text) cascade;
drop function if exists fn_tiene_rol(text) cascade;
drop function if exists fn_es_admin() cascade;
drop function if exists fn_es_directivo() cascade;
drop function if exists fn_es_personal_resultados() cascade;
drop function if exists fn_configurar_admin_por_email(text) cascade;
drop function if exists fn_obtener_estado_eleccion_publico() cascade;

drop table if exists eventos_resultado cascade;
drop table if exists directivo_invitaciones cascade;
drop table if exists perfiles cascade;
drop table if exists votantes cascade;
drop table if exists votos cascade;
drop table if exists candidatos cascade;
drop table if exists listas cascade;
drop table if exists miembros_mesa cascade;
drop table if exists estudiantes cascade;
drop table if exists mesas cascade;
drop table if exists eleccion cascade;
drop table if exists colegio cascade;

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------
create table colegio (
  id            bigint primary key default 1,
  nombre        text not null default 'Institución Educativa',
  ie_codigo     text,
  lema          text,
  distrito      text,
  insignia_url  text,
  updated_at    timestamptz not null default now(),
  constraint colegio_singleton check (id = 1)
);

create table eleccion (
  id           bigint generated always as identity primary key,
  nombre       text not null,
  fecha        date not null,
  hora_inicio  time not null,
  hora_fin     time not null,
  estado       text not null default 'configuracion'
               check (estado in ('configuracion','abierta','cerrada')),
  created_at   timestamptz not null default now()
);

create unique index if not exists ux_una_eleccion_abierta on eleccion(estado) where estado='abierta';

create table mesas (
  id             bigint generated always as identity primary key,
  numero         int not null unique,
  nombre         text not null,
  grado_seccion  text,
  estado         text not null default 'pendiente'
                 check (estado in ('pendiente','instalada','cerrada')),
  created_at     timestamptz not null default now()
);

create table estudiantes (
  id           bigint generated always as identity primary key,
  nombres      text not null,
  apellidos    text not null,
  dni          text not null unique,
  grado        text not null,
  seccion      text not null,
  mesa_id      bigint references mesas(id) on delete set null,
  ha_votado    boolean not null default false,
  created_at   timestamptz not null default now()
);
create index idx_estudiantes_dni on estudiantes(dni);
create index idx_estudiantes_mesa on estudiantes(mesa_id);

create table miembros_mesa (
  id             bigint generated always as identity primary key,
  mesa_id        bigint not null references mesas(id) on delete restrict,
  estudiante_id  bigint not null references estudiantes(id) on delete restrict,
  cargo          text not null check (cargo in ('presidente','secretario','vocal','suplente')),
  created_at     timestamptz not null default now(),
  unique (mesa_id, estudiante_id)
);

create table listas (
  id           bigint generated always as identity primary key,
  eleccion_id  bigint not null references eleccion(id) on delete restrict,
  numero       int not null,
  nombre       text not null,
  logo_url     text,
  activa       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (eleccion_id, numero)
);
create index idx_listas_eleccion on listas(eleccion_id);

create table candidatos (
  id             bigint generated always as identity primary key,
  eleccion_id    bigint not null references eleccion(id) on delete restrict,
  lista_id       bigint not null references listas(id) on delete cascade,
  estudiante_id  bigint references estudiantes(id) on delete set null,
  nombres        text not null,
  apellidos      text not null,
  cargo          text not null,
  foto_url       text,
  created_at     timestamptz not null default now(),
  unique (eleccion_id, estudiante_id)
);

-- La identidad del elector nunca se guarda en votos.
create table votos (
  id           bigint generated always as identity primary key,
  eleccion_id  bigint not null references eleccion(id) on delete restrict,
  mesa_id      bigint not null references mesas(id) on delete restrict,
  lista_id     bigint references listas(id) on delete restrict,
  es_blanco    boolean not null default false,
  fecha_hora   timestamptz not null default now(),
  constraint votos_blanco_coherente check ((lista_id is null) = es_blanco)
);
create index idx_votos_eleccion on votos(eleccion_id);
create index idx_votos_mesa on votos(mesa_id);
create index idx_votos_lista on votos(lista_id);

create table votantes (
  id            bigint generated always as identity primary key,
  eleccion_id   bigint not null references eleccion(id) on delete restrict,
  estudiante_id bigint not null references estudiantes(id) on delete restrict,
  fecha_hora    timestamptz not null default now(),
  unique (eleccion_id, estudiante_id)
);
create index idx_votantes_eleccion on votantes(eleccion_id);

-- Perfil de autorización de cada usuario de Supabase Auth.
-- rol=admin: gestión completa.
-- rol=directivo: solo resultados; subrol=director/subdirector.
create table perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  rol         text not null check (rol in ('admin','directivo')),
  subrol      text check (subrol in ('director','subdirector')),
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint perfil_subrol_coherente check (
    (rol = 'admin' and subrol is null) or
    (rol = 'directivo' and subrol is not null)
  )
);
create unique index ux_perfiles_email on perfiles(lower(email));

-- Invitaciones creadas SOLO por un administrador. El token real nunca
-- se guarda: solo se conserva su SHA-256.
create table directivo_invitaciones (
  id             bigint generated always as identity primary key,
  email          text not null,
  subrol         text not null check (subrol in ('director','subdirector')),
  token_hash     text not null unique,
  estado         text not null default 'pendiente'
                 check (estado in ('pendiente','usada','revocada','expirada')),
  expires_at     timestamptz not null,
  created_by     uuid not null references auth.users(id) on delete restrict,
  used_by       uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  used_at       timestamptz
);
create unique index ux_invitacion_pendiente_email
  on directivo_invitaciones(lower(email)) where estado = 'pendiente';

-- Tabla sin datos electorales sensibles: solo dispara Realtime para que
-- la pantalla de resultados se actualice al entrar un voto.
create table eventos_resultado (
  id          bigint generated always as identity primary key,
  eleccion_id bigint not null references eleccion(id) on delete restrict,
  created_at  timestamptz not null default now()
);
create index idx_eventos_resultado_eleccion on eventos_resultado(eleccion_id, created_at desc);

-- ---------------------------------------------------------------------
-- 2. FUNCIONES DE ROLES
-- ---------------------------------------------------------------------
create or replace function fn_tiene_rol(p_rol text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from perfiles p
    where p.id = auth.uid()
      and p.rol = p_rol
      and p.activo = true
  );
$$;

create or replace function fn_es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select fn_tiene_rol('admin');
$$;

create or replace function fn_es_directivo()
returns boolean language sql stable security definer set search_path = public as $$
  select fn_tiene_rol('directivo');
$$;

create or replace function fn_es_personal_resultados()
returns boolean language sql stable security definer set search_path = public as $$
  select fn_es_admin() or fn_es_directivo();
$$;

-- Esta función se usa SOLO desde SQL Editor para enlazar el usuario admin
-- que ya existe en Authentication -> Users.
create or replace function fn_configurar_admin_por_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user auth.users%rowtype;
begin
  select * into v_user from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if not found then raise exception 'No existe un usuario Auth con ese correo.'; end if;
  insert into perfiles(id,email,rol,subrol,activo)
  values(v_user.id, coalesce(v_user.email,p_email), 'admin', null, true)
  on conflict(id) do update set email=excluded.email, rol='admin', subrol=null, activo=true, updated_at=now();
end;
$$;
revoke all on function fn_configurar_admin_por_email(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------
alter table colegio enable row level security;
alter table eleccion enable row level security;
alter table mesas enable row level security;
alter table estudiantes enable row level security;
alter table miembros_mesa enable row level security;
alter table listas enable row level security;
alter table candidatos enable row level security;
alter table votos enable row level security;
alter table votantes enable row level security;
alter table perfiles enable row level security;
alter table directivo_invitaciones enable row level security;
alter table eventos_resultado enable row level security;

create policy "colegio_admin_all" on colegio for all using (fn_es_admin()) with check (fn_es_admin());
create policy "colegio_public_select" on colegio for select using (true);

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
create policy "eleccion_public_select" on eleccion for select using (true);
create policy "eleccion_directivo_select" on eleccion for select using (fn_es_directivo());

create policy "mesas_admin_select" on mesas for select using(fn_es_admin());
create policy "mesas_admin_insert" on mesas for insert with check(fn_es_admin());
create policy "mesas_admin_update" on mesas for update using(fn_es_admin() and not exists(select 1 from votos v where v.mesa_id=mesas.id)) with check(fn_es_admin() and not exists(select 1 from votos v where v.mesa_id=mesas.id));
create policy "mesas_admin_delete" on mesas for delete using(fn_es_admin() and not exists(select 1 from votos v where v.mesa_id=mesas.id));
create policy "estudiantes_admin_all" on estudiantes for all using (fn_es_admin()) with check (fn_es_admin());
create policy "miembros_mesa_admin_all" on miembros_mesa for all using (fn_es_admin()) with check (fn_es_admin());

-- No se permite modificar listas de una elección abierta ni una elección
-- que ya tenga votos. Así se protege el resultado histórico.
create policy "listas_admin_select" on listas for select using (fn_es_admin());
create policy "listas_admin_insert" on listas for insert
  with check (
    fn_es_admin()
    and exists (select 1 from eleccion e where e.id = eleccion_id and e.estado <> 'abierta')
    and not exists (select 1 from votos v where v.eleccion_id = listas.eleccion_id)
  );
create policy "listas_admin_update" on listas for update
  using (
    fn_es_admin()
    and not exists (select 1 from votos v where v.eleccion_id = listas.eleccion_id)
    and exists (select 1 from eleccion e where e.id = listas.eleccion_id and e.estado <> 'abierta')
  )
  with check (
    fn_es_admin()
    and not exists (select 1 from votos v where v.eleccion_id = listas.eleccion_id)
    and exists (select 1 from eleccion e where e.id = listas.eleccion_id and e.estado <> 'abierta')
  );
create policy "listas_admin_delete" on listas for delete
  using (fn_es_admin() and not exists (select 1 from votos v where v.lista_id = listas.id));
create policy "listas_public_select" on listas for select using (activa = true);
create policy "listas_directivo_select" on listas for select using (fn_es_directivo());

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
create policy "candidatos_public_select" on candidatos for select using (
  exists (select 1 from listas l where l.id = candidatos.lista_id and l.activa = true)
);
create policy "candidatos_directivo_select" on candidatos for select using (fn_es_directivo());

create policy "votos_admin_select" on votos for select using (fn_es_admin());
create policy "votantes_admin_select" on votantes for select using (fn_es_admin());

create policy "perfiles_self_select" on perfiles for select using (id = auth.uid());
create policy "perfiles_admin_all" on perfiles for all using (fn_es_admin()) with check (fn_es_admin());

create policy "invitaciones_admin_all" on directivo_invitaciones for all using (fn_es_admin()) with check (fn_es_admin());

create policy "eventos_resultado_personal_select" on eventos_resultado
  for select using (fn_es_personal_resultados());

-- ---------------------------------------------------------------------
-- 4. TRIGGER DE REALTIME
-- ---------------------------------------------------------------------
create or replace function fn_registrar_evento_resultado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into eventos_resultado(eleccion_id) values (new.eleccion_id);
  return new;
end;
$$;

drop trigger if exists trg_voto_evento_resultado on votos;
create trigger trg_voto_evento_resultado
after insert on votos
for each row execute function fn_registrar_evento_resultado();

-- ---------------------------------------------------------------------
-- 5. FUNCIONES DE ELECCIÓN Y TIEMPO (America/Lima)
-- ---------------------------------------------------------------------
create or replace function fn_cerrar_elecciones_vencidas()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update eleccion e
  set estado = 'cerrada'
  where e.estado = 'abierta'
    and now() >= (
      (e.fecha + e.hora_fin) at time zone 'America/Lima'
      + case when e.hora_fin <= e.hora_inicio then interval '1 day' else interval '0 day' end
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function fn_cerrar_elecciones_vencidas() from public, anon, authenticated;

create or replace function fn_abrir_eleccion(p_eleccion_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_eleccion eleccion%rowtype;
begin
  if not fn_es_admin() then raise exception 'No tienes permisos para abrir la elección.'; end if;
  select * into v_eleccion from eleccion where id=p_eleccion_id for update;
  if not found then raise exception 'La elección no existe.'; end if;
  if v_eleccion.estado = 'abierta' then raise exception 'La elección ya está abierta.'; end if;
  if v_eleccion.estado = 'cerrada' then raise exception 'La elección ya fue cerrada y no puede reabrirse.'; end if;
  if now() >= ((v_eleccion.fecha + v_eleccion.hora_fin) at time zone 'America/Lima'
      + case when v_eleccion.hora_fin <= v_eleccion.hora_inicio then interval '1 day' else interval '0 day' end)
  then raise exception 'La hora final de esta elección ya pasó. Crea/configura una nueva jornada.'; end if;
  update eleccion set estado='abierta' where id=p_eleccion_id;
end;
$$;
revoke all on function fn_abrir_eleccion(bigint) from public, anon;
grant execute on function fn_abrir_eleccion(bigint) to authenticated;

create or replace function fn_cerrar_eleccion(p_eleccion_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not fn_es_admin() then raise exception 'No tienes permisos para cerrar la elección.'; end if;
  update eleccion set estado='cerrada' where id=p_eleccion_id and estado='abierta';
  if not found then raise exception 'La elección no está abierta o no existe.'; end if;
end;
$$;
revoke all on function fn_cerrar_eleccion(bigint) from public, anon;
grant execute on function fn_cerrar_eleccion(bigint) to authenticated;

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
    update eleccion set estado='cerrada' where id=v_eleccion.id and estado='abierta';
    v_eleccion.estado:='cerrada';
  end if;
  return query select v_eleccion.id,v_eleccion.nombre,v_eleccion.fecha,v_eleccion.hora_inicio,v_eleccion.hora_fin,v_eleccion.estado,v_inicio,v_fin,v_now;
end;
$$;
revoke all on function fn_obtener_estado_eleccion_publico() from public;
grant execute on function fn_obtener_estado_eleccion_publico() to anon,authenticated;

-- ---------------------------------------------------------------------
-- 6. RPC DE VOTACIÓN
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
  if v_dni !~ '^[0-9]{8}$' then raise exception 'Ingresa un DNI válido de 8 dígitos.'; end if;
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
  if not found then raise exception 'El DNI ingresado no figura en el padrón electoral.'; end if;
end;
$$;
revoke all on function fn_consultar_estudiante(text) from public;
grant execute on function fn_consultar_estudiante(text) to anon, authenticated;

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
  if not found then raise exception 'El DNI ingresado no figura en el padrón electoral.'; end if;
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
-- 7. INVITACIONES DE DIRECTIVOS
-- ---------------------------------------------------------------------
create or replace function fn_crear_invitacion_directivo(p_email text, p_subrol text, p_dias integer default 7)
returns table(token text,email text,subrol text,expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_expires timestamptz;
  v_email text := lower(trim(p_email));
  v_id bigint;
begin
  if not fn_es_admin() then raise exception 'Solo un administrador puede crear invitaciones.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Ingresa un correo válido.'; end if;
  if p_subrol not in ('director','subdirector') then raise exception 'El rol directivo debe ser director o subdirector.'; end if;
  if p_dias < 1 or p_dias > 30 then raise exception 'La invitación puede durar entre 1 y 30 días.'; end if;
  if exists(select 1 from perfiles where lower(email)=v_email and activo=true) then raise exception 'Ese usuario ya tiene un perfil activo.'; end if;

  update directivo_invitaciones set estado='revocada'
  where lower(email)=v_email and estado='pendiente';

  v_token := encode(gen_random_bytes(24),'hex');
  v_expires := now() + make_interval(days=>p_dias);
  insert into directivo_invitaciones(email,subrol,token_hash,expires_at,created_by)
  values(v_email,p_subrol,encode(digest(v_token,'sha256'),'hex'),v_expires,auth.uid())
  returning id into v_id;

  return query select v_token,v_email,p_subrol,v_expires;
end;
$$;
revoke all on function fn_crear_invitacion_directivo(text,text,integer) from public, anon;
grant execute on function fn_crear_invitacion_directivo(text,text,integer) to authenticated;

create or replace function fn_activar_invitacion_directivo(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv directivo_invitaciones%rowtype;
  v_email text;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Debes iniciar sesión para activar la invitación.'; end if;
  select lower(email) into v_email from auth.users where id=v_user_id;
  select * into v_inv from directivo_invitaciones
  where token_hash=encode(digest(trim(p_token),'sha256'),'hex')
  order by id desc limit 1 for update;

  if not found then raise exception 'La invitación no es válida.'; end if;
  if v_inv.estado <> 'pendiente' then raise exception 'La invitación ya fue usada, revocada o cerrada.'; end if;
  if v_inv.expires_at <= now() then
    update directivo_invitaciones set estado='expirada' where id=v_inv.id;
    raise exception 'La invitación ha expirado.';
  end if;
  if v_email is null or lower(v_inv.email) <> v_email then raise exception 'El correo de la cuenta no coincide con el correo invitado.'; end if;

  insert into perfiles(id,email,rol,subrol,activo)
  values(v_user_id,v_email,'directivo',v_inv.subrol,true)
  on conflict(id) do update set email=excluded.email,rol='directivo',subrol=excluded.subrol,activo=true,updated_at=now();

  update directivo_invitaciones set estado='usada',used_by=v_user_id,used_at=now() where id=v_inv.id;
  return json_build_object('ok',true,'rol','directivo','subrol',v_inv.subrol,'mensaje','Cuenta directiva activada correctamente.');
end;
$$;
revoke all on function fn_activar_invitacion_directivo(text) from public, anon;
grant execute on function fn_activar_invitacion_directivo(text) to authenticated;

-- ---------------------------------------------------------------------
-- 8. RPC DE RESULTADOS: solo admin/directivo
-- ---------------------------------------------------------------------
create or replace function fn_resultados_generales(p_eleccion_id bigint)
returns table(eleccion_id bigint,lista_id bigint,numero integer,nombre text,total_votos bigint,porcentaje numeric)
language plpgsql
security definer
set search_path=public
as $$
begin
  if not fn_es_personal_resultados() then raise exception 'No tienes permiso para consultar resultados.'; end if;
  return query
  select l.eleccion_id,l.id,l.numero,l.nombre,count(v.id)::bigint,
         round(100.0*count(v.id)/nullif((select count(*) from votos vx where vx.eleccion_id=l.eleccion_id),0),2)
  from listas l left join votos v on v.lista_id=l.id and v.eleccion_id=l.eleccion_id
  where l.eleccion_id=p_eleccion_id
  group by l.eleccion_id,l.id,l.numero,l.nombre
  order by count(v.id) desc,l.numero;
end;
$$;
revoke all on function fn_resultados_generales(bigint) from public, anon;
grant execute on function fn_resultados_generales(bigint) to authenticated;

create or replace function fn_resultados_por_mesa(p_eleccion_id bigint)
returns table(mesa_id bigint,mesa_numero integer,mesa_nombre text,eleccion_id bigint,lista_id bigint,lista_nombre text,total_votos bigint)
language plpgsql
security definer
set search_path=public
as $$
begin
  if not fn_es_personal_resultados() then raise exception 'No tienes permiso para consultar resultados.'; end if;
  return query
  select m.id,m.numero,m.nombre,l.eleccion_id,l.id,l.nombre,count(v.id)::bigint
  from mesas m cross join listas l
  left join votos v on v.mesa_id=m.id and v.lista_id=l.id and v.eleccion_id=p_eleccion_id
  where l.eleccion_id=p_eleccion_id
  group by m.id,m.numero,m.nombre,l.eleccion_id,l.id,l.nombre
  order by m.numero,l.numero;
end;
$$;
revoke all on function fn_resultados_por_mesa(bigint) from public, anon;
grant execute on function fn_resultados_por_mesa(bigint) to authenticated;

create or replace function fn_resumen_resultados(p_eleccion_id bigint)
returns table(total_votos bigint,votos_blanco bigint,total_emitidos bigint)
language plpgsql
security definer
set search_path=public
as $$
begin
  if not fn_es_personal_resultados() then raise exception 'No tienes permiso para consultar resultados.'; end if;
  return query
  select count(*) filter(where not es_blanco)::bigint,
         count(*) filter(where es_blanco)::bigint,
         count(*)::bigint
  from votos where eleccion_id=p_eleccion_id;
end;
$$;
revoke all on function fn_resumen_resultados(bigint) from public, anon;
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

-- ---------------------------------------------------------------------
-- 9. VISTAS DE RESULTADOS PARA EL PANEL ADMINISTRATIVO DE MESAS.
-- La página resultados.html usa RPC para respetar roles; estas vistas se
-- conservan para mesas.html, que solo puede abrir un admin.
-- ---------------------------------------------------------------------
create view vw_resultados_generales with (security_invoker=true) as
select l.eleccion_id,l.id as lista_id,l.numero,l.nombre,count(v.id)::bigint as total_votos,
       round(100.0*count(v.id)/nullif((select count(*) from votos vx where vx.eleccion_id=l.eleccion_id),0),2) as porcentaje
from listas l left join votos v on v.lista_id=l.id and v.eleccion_id=l.eleccion_id
group by l.eleccion_id,l.id,l.numero,l.nombre
order by l.eleccion_id desc,total_votos desc;

create view vw_resultados_por_mesa with (security_invoker=true) as
select m.id as mesa_id,m.numero as mesa_numero,m.nombre as mesa_nombre,l.eleccion_id,l.id as lista_id,l.nombre as lista_nombre,count(v.id)::bigint as total_votos
from mesas m cross join listas l
left join votos v on v.mesa_id=m.id and v.lista_id=l.id and v.eleccion_id=l.eleccion_id
group by m.id,m.numero,m.nombre,l.eleccion_id,l.id,l.nombre
order by l.eleccion_id desc,m.numero,l.numero;

grant select on vw_resultados_generales,vw_resultados_por_mesa to authenticated;

-- ---------------------------------------------------------------------
-- 10. STORAGE
-- ---------------------------------------------------------------------
insert into storage.buckets(id,name,public) values('media','media',true) on conflict(id) do nothing;
drop policy if exists "media_public_read" on storage.objects;
drop policy if exists "media_admin_insert" on storage.objects;
drop policy if exists "media_admin_update" on storage.objects;
drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_public_read" on storage.objects for select using(bucket_id='media');
create policy "media_admin_insert" on storage.objects for insert with check(bucket_id='media' and fn_es_admin());
create policy "media_admin_update" on storage.objects for update using(bucket_id='media' and fn_es_admin());
create policy "media_admin_delete" on storage.objects for delete using(bucket_id='media' and fn_es_admin());

-- ---------------------------------------------------------------------
-- 11. DATOS INICIALES
-- ---------------------------------------------------------------------
insert into colegio(id,nombre,ie_codigo,lema) values(1,'Institución Educativa','I.E. N° 000','') on conflict(id) do nothing;
insert into eleccion(nombre,fecha,hora_inicio,hora_fin,estado)
values('Elección Municipio Escolar 2026',current_date,'08:00','13:00','configuracion');
insert into mesas(numero,nombre,grado_seccion) values
  (1,'Mesa 01','1ro Secundaria - A'),
  (2,'Mesa 02','2do Secundaria - A');

-- En una instalación nueva, crea el usuario admin desde Authentication -> Users
-- y luego ejecuta en SQL Editor, sustituyendo el correo:
-- select fn_configurar_admin_por_email('admin@colegio.edu.pe');

-- ---------------------------------------------------------------------
-- 12. REALTIME Y CRON
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='eventos_resultado'
  ) then
    alter publication supabase_realtime add table public.eventos_resultado;
  end if;
exception when undefined_object then
  raise notice 'supabase_realtime no está disponible todavía; actívalo en Database -> Replication y vuelve a ejecutar el bloque de publicación.';
end $$;

select cron.unschedule(jobid) from cron.job where jobname='cerrar-elecciones-vencidas';
select cron.schedule('cerrar-elecciones-vencidas','* * * * *',$$select public.fn_cerrar_elecciones_vencidas();$$);

-- =====================================================================
-- FIN
-- =====================================================================
