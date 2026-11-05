-- =====================================================================
-- Pequeños Atletas — 0007_ejercicios_remotas.sql
-- Repositorio de ejercicios (solo entrenador) y sesiones remotas (ejercicios para casa).
-- Ejecutar DESPUÉS de 0001–0006. Se puede correr varias veces (idempotente).
-- =====================================================================

-- 1. Tablas -----------------------------------------------------------
create table if not exists public.ejercicios (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  tipo text,
  creado_en timestamptz not null default now()
);

create table if not exists public.sesiones_remotas (
  id text primary key,
  datos jsonb not null default '{}'::jsonb,
  nino_id text not null references public.ninos(id) on delete cascade,
  acudientes_ids uuid[],
  estado text,
  fecha text,
  creado_en timestamptz not null default now()
);
create index if not exists remotas_nino_idx on public.sesiones_remotas (nino_id);
create index if not exists remotas_estado_idx on public.sesiones_remotas (estado);
create index if not exists remotas_fecha_idx on public.sesiones_remotas (fecha);
create index if not exists remotas_acudientes_gin on public.sesiones_remotas using gin (acudientes_ids);

-- 2. Tiempo real ------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['ejercicios','sesiones_remotas'] loop
    execute format('alter table public.%I replica identity full', t);
    begin
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    exception when others then null;
    end;
  end loop;
end $$;

-- 3. Columnas derivadas de `datos` -----------------------------------
drop trigger if exists a_derivar on public.ejercicios;
create trigger a_derivar before insert or update on public.ejercicios
  for each row execute function public.derivar_columnas('tipo=tipo');
drop trigger if exists a_derivar on public.sesiones_remotas;
create trigger a_derivar before insert or update on public.sesiones_remotas
  for each row execute function public.derivar_columnas('nino_id=ninoId','acudientes_ids=acudientesIds','estado=estado','fecha=fecha');

-- 4. Permisos y seguridad (RLS) --------------------------------------
alter table public.ejercicios enable row level security;
alter table public.sesiones_remotas enable row level security;
revoke all on public.ejercicios from anon, authenticated;
revoke all on public.sesiones_remotas from anon, authenticated;
grant select, insert, update, delete on public.ejercicios to authenticated;
grant select, insert, update, delete on public.sesiones_remotas to authenticated;

-- ejercicios: solo el entrenador (a los padres les llega una copia dentro de la sesión remota).
drop policy if exists ejercicios_select on public.ejercicios;
create policy ejercicios_select on public.ejercicios for select to authenticated using (public.es_entrenador());
drop policy if exists ejercicios_insert on public.ejercicios;
create policy ejercicios_insert on public.ejercicios for insert to authenticated with check (public.es_entrenador());
drop policy if exists ejercicios_update on public.ejercicios;
create policy ejercicios_update on public.ejercicios for update to authenticated using (public.es_entrenador()) with check (public.es_entrenador());
drop policy if exists ejercicios_delete on public.ejercicios;
create policy ejercicios_delete on public.ejercicios for delete to authenticated using (public.es_entrenador());

-- sesiones_remotas: lee entrenador o acudiente; crea y borra el entrenador; el acudiente solo sube videos.
drop policy if exists sesiones_remotas_select on public.sesiones_remotas;
create policy sesiones_remotas_select on public.sesiones_remotas for select to authenticated
  using (public.es_entrenador() or (select auth.uid()) = any (acudientes_ids));
drop policy if exists sesiones_remotas_insert on public.sesiones_remotas;
create policy sesiones_remotas_insert on public.sesiones_remotas for insert to authenticated with check (public.es_entrenador());
drop policy if exists sesiones_remotas_update on public.sesiones_remotas;
create policy sesiones_remotas_update on public.sesiones_remotas for update to authenticated
  using (public.es_entrenador() or (select auth.uid()) = any (acudientes_ids))
  with check (public.es_entrenador() or (select auth.uid()) = any (acudientes_ids));
drop policy if exists sesiones_remotas_delete on public.sesiones_remotas;
create policy sesiones_remotas_delete on public.sesiones_remotas for delete to authenticated using (public.es_entrenador());

-- Si no es entrenador, solo puede cambiar el campo `video` de cada ejercicio (y marcar la sesión como entregada).
create or replace function public.b_remotas_restringir()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  i int;
  n int;
begin
  if (select auth.uid()) is not null and not public.es_entrenador() then
    n := coalesce(jsonb_array_length(old.datos -> 'ejercicios'), 0);
    if coalesce(jsonb_array_length(new.datos -> 'ejercicios'), 0) <> n
       or (new.datos - 'ejercicios' - 'estado') is distinct from (old.datos - 'ejercicios' - 'estado')
       or new.nino_id is distinct from old.nino_id
       or new.estado is distinct from old.estado and not (new.estado = 'entregada' and old.estado = 'enviada')
    then
      raise exception 'Solo puedes subir los videos de tu hijo';
    end if;
    for i in 0 .. n - 1 loop
      if ((new.datos -> 'ejercicios' -> i) - 'video') is distinct from ((old.datos -> 'ejercicios' -> i) - 'video') then
        raise exception 'Solo puedes subir los videos de tu hijo';
      end if;
    end loop;
  end if;
  return new;
end;
$$;
drop trigger if exists b_restringir on public.sesiones_remotas;
create trigger b_restringir before update on public.sesiones_remotas
  for each row execute function public.b_remotas_restringir();

-- 5. Avisos de la campanita -------------------------------------------
create or replace function public.c_remotas_aviso()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_nino text;
  v_antes int := 0;
  v_ahora int := 0;
  v_fb_antes int := 0;
  v_fb_ahora int := 0;
begin
  select n.datos ->> 'nombres' into v_nino from public.ninos n where n.id = new.nino_id;
  if tg_op = 'INSERT' then
    perform public.notificar(new.acudientes_ids, 'ejercicios_casa', 'Ejercicios para casa',
      'El entrenador envió ejercicios para ' || coalesce(v_nino, 'tu hijo') || '. Grábalo (máx. 30 s) y súbelo.', '/p/casa/' || new.id);
    return null;
  end if;
  select count(*) into v_antes from jsonb_array_elements(coalesce(old.datos -> 'ejercicios', '[]'::jsonb)) e where jsonb_typeof(e -> 'video') = 'object';
  select count(*) into v_ahora from jsonb_array_elements(coalesce(new.datos -> 'ejercicios', '[]'::jsonb)) e where jsonb_typeof(e -> 'video') = 'object';
  if v_ahora > v_antes then
    perform public.notificar(public.ids_entrenador(), 'video_recibido', 'Video recibido',
      coalesce(v_nino, 'Un niño') || ' subió un video de ejercicios en casa.', '/e/remota/' || new.id);
  end if;
  select count(*) into v_fb_antes from jsonb_array_elements(coalesce(old.datos -> 'ejercicios', '[]'::jsonb)) e where coalesce(e ->> 'feedback', '') <> '';
  select count(*) into v_fb_ahora from jsonb_array_elements(coalesce(new.datos -> 'ejercicios', '[]'::jsonb)) e where coalesce(e ->> 'feedback', '') <> '';
  if v_fb_ahora > v_fb_antes then
    perform public.notificar(new.acudientes_ids, 'ejercicios_casa', 'Comentarios del entrenador',
      'El entrenador comentó los videos de ' || coalesce(v_nino, 'tu hijo') || '.', '/p/casa/' || new.id);
  end if;
  return null;
end;
$$;
drop trigger if exists c_remotas_aviso on public.sesiones_remotas;
create trigger c_remotas_aviso after insert or update on public.sesiones_remotas
  for each row execute function public.c_remotas_aviso();

-- 6. Videos (bucket privado `remotas`): remotas/{ninoId}/{archivo} ---------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('remotas', 'remotas', false, 52428800, array['video/*'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "remotas_leer" on storage.objects;
create policy "remotas_leer" on storage.objects for select to authenticated
  using (bucket_id = 'remotas' and (public.es_entrenador() or public.es_acudiente_de_nino((storage.foldername(name))[1])));
drop policy if exists "remotas_subir" on storage.objects;
create policy "remotas_subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'remotas' and (public.es_entrenador() or public.es_acudiente_de_nino((storage.foldername(name))[1])));
drop policy if exists "remotas_actualizar" on storage.objects;
create policy "remotas_actualizar" on storage.objects for update to authenticated
  using (bucket_id = 'remotas' and public.es_acudiente_de_nino((storage.foldername(name))[1]))
  with check (bucket_id = 'remotas' and public.es_acudiente_de_nino((storage.foldername(name))[1]));
drop policy if exists "remotas_borrar" on storage.objects;
create policy "remotas_borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'remotas' and (public.es_entrenador() or public.es_acudiente_de_nino((storage.foldername(name))[1])));
