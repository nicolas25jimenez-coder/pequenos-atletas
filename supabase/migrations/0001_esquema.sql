-- =====================================================================
-- Pequeños Atletas — 0001_esquema.sql
-- Tablas, índices y Realtime. La seguridad (RLS, triggers, storage) va en 0002.
--
-- Convención: cada tabla guarda el OBJETO COMPLETO en `datos` (jsonb, sin el id)
-- y repite en columnas reales los campos usados para filtrar / FK / RLS.
-- Esas columnas las rellena el servidor desde `datos` (ver 0002), así el
-- cliente solo envía { id, datos }.
-- Fechas como text ('YYYY-MM-DD' o ISO 8601), no `date`.
-- Se puede pegar completo en el SQL Editor de Supabase (es idempotente).
-- =====================================================================

-- ---------- Perfiles ----------
create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  datos jsonb not null default '{}'::jsonb,
  rol text,
  estado text,
  correo text,
  creado_en timestamptz not null default now()
);

-- ---------- Catálogos / configuración ----------
create table if not exists public.categorias (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  activa boolean,
  creado_en timestamptz not null default now()
);

create table if not exists public.pruebas (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  activa boolean,
  creado_en timestamptz not null default now()
);

create table if not exists public.plantillas_control (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create table if not exists public.medios_pago (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create table if not exists public.anuncios (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create table if not exists public.configuracion (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create table if not exists public.eventos (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  fecha_inicio text,
  creado_en timestamptz not null default now()
);

-- ---------- Niños ----------
create table if not exists public.ninos (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  estado text,
  categoria_id text,
  acudientes_ids uuid[],
  creado_en timestamptz not null default now()
);

create table if not exists public.sesiones (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  categoria_id text,
  fecha text,
  estado text,
  creado_en timestamptz not null default now()
);

-- ---------- Datos por niño ----------
create table if not exists public.asistencias (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  sesion_id text,
  nino_id text not null references public.ninos(id) on delete cascade,
  acudientes_ids uuid[],
  categoria_id text,
  fecha text,
  estado text,
  creado_en timestamptz not null default now()
);

create table if not exists public.mediciones_fisicas (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  nino_id text not null references public.ninos(id) on delete cascade,
  acudientes_ids uuid[],
  fecha text,
  creado_en timestamptz not null default now()
);

create table if not exists public.pagos (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  nino_id text not null references public.ninos(id) on delete cascade,
  acudientes_ids uuid[],
  periodo text,
  estado text,
  fecha_vencimiento text,
  categoria_id text,
  creado_en timestamptz not null default now()
);

create table if not exists public.resultados_pruebas (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  sesion_id text,
  nino_id text not null references public.ninos(id) on delete cascade,
  prueba_id text,
  acudientes_ids uuid[],
  fecha text,
  creado_en timestamptz not null default now()
);

create table if not exists public.confirmaciones_evento (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  evento_id text,
  nino_id text not null references public.ninos(id) on delete cascade,
  acudientes_ids uuid[],
  creado_en timestamptz not null default now()
);

create table if not exists public.solicitudes_cambio (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  nino_id text not null references public.ninos(id) on delete cascade,
  acudientes_ids uuid[],
  estado text,
  solicitado_por uuid,
  creado_en timestamptz not null default now()
);

create table if not exists public.invitaciones (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  correo text,
  invitado_por uuid,
  estado text,
  ninos_ids text[],
  creado_en timestamptz not null default now()
);

create table if not exists public.notificaciones (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  leida boolean,
  fecha text,
  creado_en timestamptz not null default now()
);

-- ---------- Índices ----------
create index if not exists usuarios_rol_idx on public.usuarios (rol);
create index if not exists usuarios_estado_idx on public.usuarios (estado);
create index if not exists usuarios_correo_idx on public.usuarios (lower(correo));

create index if not exists ninos_estado_idx on public.ninos (estado);
create index if not exists ninos_categoria_idx on public.ninos (categoria_id);
create index if not exists ninos_acudientes_gin on public.ninos using gin (acudientes_ids);

create index if not exists categorias_activa_idx on public.categorias (activa);
create index if not exists pruebas_activa_idx on public.pruebas (activa);
create index if not exists eventos_fecha_inicio_idx on public.eventos (fecha_inicio);

create index if not exists sesiones_categoria_idx on public.sesiones (categoria_id);
create index if not exists sesiones_fecha_idx on public.sesiones (fecha);
create index if not exists sesiones_estado_idx on public.sesiones (estado);

create index if not exists asistencias_sesion_idx on public.asistencias (sesion_id);
create index if not exists asistencias_nino_idx on public.asistencias (nino_id);
create index if not exists asistencias_categoria_idx on public.asistencias (categoria_id);
create index if not exists asistencias_fecha_idx on public.asistencias (fecha);
create index if not exists asistencias_estado_idx on public.asistencias (estado);
create index if not exists asistencias_acudientes_gin on public.asistencias using gin (acudientes_ids);

create index if not exists mediciones_nino_idx on public.mediciones_fisicas (nino_id);
create index if not exists mediciones_fecha_idx on public.mediciones_fisicas (fecha);
create index if not exists mediciones_acudientes_gin on public.mediciones_fisicas using gin (acudientes_ids);

create index if not exists pagos_nino_idx on public.pagos (nino_id);
create index if not exists pagos_periodo_idx on public.pagos (periodo);
create index if not exists pagos_estado_idx on public.pagos (estado);
create index if not exists pagos_vencimiento_idx on public.pagos (fecha_vencimiento);
create index if not exists pagos_categoria_idx on public.pagos (categoria_id);
create index if not exists pagos_acudientes_gin on public.pagos using gin (acudientes_ids);

create index if not exists resultados_sesion_idx on public.resultados_pruebas (sesion_id);
create index if not exists resultados_nino_idx on public.resultados_pruebas (nino_id);
create index if not exists resultados_prueba_idx on public.resultados_pruebas (prueba_id);
create index if not exists resultados_fecha_idx on public.resultados_pruebas (fecha);
create index if not exists resultados_acudientes_gin on public.resultados_pruebas using gin (acudientes_ids);

create index if not exists confirmaciones_evento_idx on public.confirmaciones_evento (evento_id);
create index if not exists confirmaciones_nino_idx on public.confirmaciones_evento (nino_id);
create index if not exists confirmaciones_acudientes_gin on public.confirmaciones_evento using gin (acudientes_ids);

create index if not exists solicitudes_nino_idx on public.solicitudes_cambio (nino_id);
create index if not exists solicitudes_estado_idx on public.solicitudes_cambio (estado);
create index if not exists solicitudes_solicitado_por_idx on public.solicitudes_cambio (solicitado_por);
create index if not exists solicitudes_acudientes_gin on public.solicitudes_cambio using gin (acudientes_ids);

create index if not exists invitaciones_correo_idx on public.invitaciones (lower(correo));
create index if not exists invitaciones_invitado_por_idx on public.invitaciones (invitado_por);
create index if not exists invitaciones_estado_idx on public.invitaciones (estado);
create index if not exists invitaciones_ninos_gin on public.invitaciones using gin (ninos_ids);

create index if not exists notificaciones_usuario_idx on public.notificaciones (usuario_id);
create index if not exists notificaciones_leida_idx on public.notificaciones (usuario_id, leida);
create index if not exists notificaciones_fecha_idx on public.notificaciones (fecha);

-- ---------- Realtime ----------
-- replica identity full: los eventos DELETE/UPDATE traen la fila completa
-- (necesario para filtrar por columnas y para que RLS evalúe bien).
do $$
declare
  t text;
  tablas text[] := array[
    'usuarios','ninos','categorias','sesiones','pruebas','plantillas_control',
    'medios_pago','eventos','anuncios','configuracion','asistencias',
    'mediciones_fisicas','pagos','resultados_pruebas','confirmaciones_evento',
    'solicitudes_cambio','invitaciones','notificaciones'
  ];
begin
  foreach t in array tablas loop
    execute format('alter table public.%I replica identity full', t);
    begin
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    exception
      when undefined_object then
        raise notice 'La publicación supabase_realtime no existe; se omite %', t;
      when duplicate_object then
        null;
    end;
  end loop;
end $$;
