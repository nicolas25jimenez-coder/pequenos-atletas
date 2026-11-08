-- =====================================================================
-- Pequeños Atletas — 0008_orientacion_medica.sql
-- Registro de cada vez que un acudiente usa el botón "Orientación médica".
-- Ejecutar DESPUÉS de 0001–0007. Se puede correr varias veces (idempotente).
-- =====================================================================

-- 1. Tabla ------------------------------------------------------------
create table if not exists public.orientaciones_medicas (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  nino_id text not null references public.ninos(id) on delete cascade,
  usuario_id uuid,
  acudientes_ids uuid[],
  fecha text,
  creado_en timestamptz not null default now()
);
create index if not exists orientaciones_nino_idx on public.orientaciones_medicas (nino_id);
create index if not exists orientaciones_usuario_idx on public.orientaciones_medicas (usuario_id);
create index if not exists orientaciones_fecha_idx on public.orientaciones_medicas (fecha);

-- 2. Tiempo real ------------------------------------------------------
alter table public.orientaciones_medicas replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orientaciones_medicas') then
    alter publication supabase_realtime add table public.orientaciones_medicas;
  end if;
exception when others then null;
end $$;

-- 3. Columnas derivadas de `datos` -----------------------------------
drop trigger if exists a_derivar on public.orientaciones_medicas;
create trigger a_derivar before insert or update on public.orientaciones_medicas
  for each row execute function public.derivar_columnas('nino_id=ninoId','usuario_id=usuarioId','acudientes_ids=acudientesIds','fecha=fecha');

-- 4. Seguridad (RLS) --------------------------------------------------
alter table public.orientaciones_medicas enable row level security;
revoke all on public.orientaciones_medicas from anon, authenticated;
grant select, insert, delete on public.orientaciones_medicas to authenticated;

-- Lee el entrenador (todo) o el acudiente (lo suyo).
drop policy if exists orientaciones_select on public.orientaciones_medicas;
create policy orientaciones_select on public.orientaciones_medicas for select to authenticated
  using (public.es_entrenador() or (select auth.uid()) = any (acudientes_ids));

-- Crea solo un acudiente del niño, a su propio nombre.
drop policy if exists orientaciones_insert on public.orientaciones_medicas;
create policy orientaciones_insert on public.orientaciones_medicas for insert to authenticated
  with check (usuario_id = (select auth.uid()) and public.es_acudiente_de_nino(nino_id));

-- Nadie edita; solo el entrenador puede borrar.
drop policy if exists orientaciones_delete on public.orientaciones_medicas;
create policy orientaciones_delete on public.orientaciones_medicas for delete to authenticated
  using (public.es_entrenador());

-- 5. Aviso a la campanita del entrenador -----------------------------
create or replace function public.c_orientacion_aviso()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_nino text;
  v_padre text;
begin
  select n.datos ->> 'nombres' into v_nino from public.ninos n where n.id = new.nino_id;
  select trim(coalesce(u.datos ->> 'nombres', '') || ' ' || coalesce(u.datos ->> 'apellidos', '')) into v_padre
    from public.usuarios u where u.id = new.usuario_id;
  perform public.notificar(public.ids_entrenador(), 'orientacion_medica', 'Orientación médica',
    coalesce(nullif(v_padre, ''), 'Un acudiente') || ' usó la orientación médica por ' || coalesce(v_nino, 'su hijo') || '.',
    '/e/orientacion-medica');
  return null;
end;
$$;
drop trigger if exists c_orientacion_aviso on public.orientaciones_medicas;
create trigger c_orientacion_aviso after insert on public.orientaciones_medicas
  for each row execute function public.c_orientacion_aviso();
