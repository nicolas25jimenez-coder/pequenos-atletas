-- =====================================================================
-- Pequeños Atletas — 0002_seguridad.sql
-- Funciones auxiliares, triggers, RLS, concesiones y Storage.
-- Traducción de firestore.rules y storage.rules. Ejecutar DESPUÉS de 0001.
-- Idempotente: se puede pegar completo en el SQL Editor más de una vez.
--
-- NOTA SOBRE `datos` Y LAS COLUMNAS REALES
-- El cliente solo envía { id, datos }. Un trigger BEFORE INSERT OR UPDATE
-- ("a_derivar") copia desde `datos` a las columnas reales (estado, nino_id,
-- acudientes_ids, ...). Así el padre no puede poner en una columna un valor
-- distinto al de `datos`. Si `datos` no trae el campo, la columna queda como
-- la mandó el cliente (o como estaba). Los triggers de validación se llaman
-- "b_..." para que corran DESPUÉS (Postgres los ejecuta en orden alfabético).
-- Las políticas RLS se evalúan sobre la fila final, ya derivada.
-- Si auth.uid() es null (service role, SQL Editor, funciones del servidor)
-- los triggers de restricción no limitan nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Funciones auxiliares (security definer evita recursión de RLS)
-- ---------------------------------------------------------------------
create or replace function public.es_entrenador()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = (select auth.uid()) and u.rol = 'entrenador'
  );
$$;

create or replace function public.es_acudiente_de_nino(nino text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ninos n
    where n.id = nino and (select auth.uid()) = any (n.acudientes_ids)
  );
$$;

create or replace function public.nino_pendiente(nino text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ninos n
    where n.id = nino and n.estado = 'pendiente_aprobacion'
  );
$$;

create or replace function public.nino_autoriza_imagen(nino text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ninos n
    where n.id = nino
      and n.datos -> 'consentimientos' -> 'usoImagen' ->> 'autorizado' = 'true'
  );
$$;

create or replace function public.acudientes_de_nino(nino text)
returns uuid[]
language sql stable security definer
set search_path = public
as $$
  select n.acudientes_ids from public.ninos n where n.id = nino;
$$;

revoke execute on function public.es_entrenador() from public, anon;
revoke execute on function public.es_acudiente_de_nino(text) from public, anon;
revoke execute on function public.nino_pendiente(text) from public, anon;
revoke execute on function public.nino_autoriza_imagen(text) from public, anon;
revoke execute on function public.acudientes_de_nino(text) from public, anon;
grant execute on function public.es_entrenador() to authenticated;
grant execute on function public.es_acudiente_de_nino(text) to authenticated;
grant execute on function public.nino_pendiente(text) to authenticated;
grant execute on function public.nino_autoriza_imagen(text) to authenticated;
grant execute on function public.acudientes_de_nino(text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Trigger genérico: rellenar columnas reales desde `datos`
--    Argumentos: 'columna=campoEnDatos' (uno por columna).
-- ---------------------------------------------------------------------
create or replace function public.derivar_columnas()
returns trigger
language plpgsql
as $$
declare
  par text;
  partes text[];
  parche jsonb := '{}'::jsonb;
begin
  foreach par in array tg_argv loop
    partes := string_to_array(par, '=');
    if (new.datos -> partes[2]) is not null then
      parche := parche || jsonb_build_object(partes[1], new.datos -> partes[2]);
    end if;
  end loop;
  if parche <> '{}'::jsonb then
    new := jsonb_populate_record(new, parche);
  end if;
  return new;
end;
$$;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('usuarios',              array['rol=rol','estado=estado','correo=correo']),
      ('ninos',                 array['estado=estado','categoria_id=categoriaId','acudientes_ids=acudientesIds']),
      ('categorias',            array['activa=activa']),
      ('sesiones',              array['categoria_id=categoriaId','fecha=fecha','estado=estado']),
      ('pruebas',               array['activa=activa']),
      ('eventos',               array['fecha_inicio=fechaInicio']),
      ('asistencias',           array['sesion_id=sesionId','nino_id=ninoId','acudientes_ids=acudientesIds','categoria_id=categoriaId','fecha=fecha','estado=estado']),
      ('mediciones_fisicas',    array['nino_id=ninoId','acudientes_ids=acudientesIds','fecha=fecha']),
      ('pagos',                 array['nino_id=ninoId','acudientes_ids=acudientesIds','periodo=periodo','estado=estado','fecha_vencimiento=fechaVencimiento','categoria_id=categoriaId']),
      ('resultados_pruebas',    array['sesion_id=sesionId','nino_id=ninoId','prueba_id=pruebaId','acudientes_ids=acudientesIds','fecha=fecha']),
      ('confirmaciones_evento', array['evento_id=eventoId','nino_id=ninoId','acudientes_ids=acudientesIds']),
      ('solicitudes_cambio',    array['nino_id=ninoId','acudientes_ids=acudientesIds','estado=estado','solicitado_por=solicitadoPor']),
      ('invitaciones',          array['correo=correo','invitado_por=invitadoPor','estado=estado','ninos_ids=ninosIds']),
      ('notificaciones',        array['usuario_id=usuarioId','leida=leida','fecha=fecha'])
    ) as v(tabla, mapeo)
  loop
    execute format('drop trigger if exists a_derivar on public.%I', r.tabla);
    execute format(
      'create trigger a_derivar before insert or update on public.%I '
      'for each row execute function public.derivar_columnas(%s)',
      r.tabla,
      (select string_agg(quote_literal(m), ',') from unnest(r.mapeo) as m)
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. Triggers de restricción por campo
-- ---------------------------------------------------------------------

-- usuarios: el padre no cambia rol / estado / correo.
create or replace function public.b_usuarios_restringir()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is not null and not public.es_entrenador() then
    if new.rol is distinct from old.rol
       or new.estado is distinct from old.estado
       or new.correo is distinct from old.correo
       or (new.datos -> 'rol') is distinct from (old.datos -> 'rol')
       or (new.datos -> 'estado') is distinct from (old.datos -> 'estado')
       or (new.datos -> 'correo') is distinct from (old.datos -> 'correo')
    then
      raise exception 'No puedes cambiar rol, estado ni correo';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists b_restringir on public.usuarios;
create trigger b_restringir before update on public.usuarios
  for each row execute function public.b_usuarios_restringir();

-- ninos: el padre solo actualiza fotoRuta, documentos, seguroMedico, actualizadoEn
-- (y solo mientras esté pendiente, lo exige la política). Nadie borra (sin política).
create or replace function public.b_ninos_restringir()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  permitidos text[] := array['fotoRuta','documentos','seguroMedico','actualizadoEn'];
begin
  if (select auth.uid()) is not null and not public.es_entrenador() then
    if (new.datos - permitidos) is distinct from (old.datos - permitidos)
       or new.estado is distinct from old.estado
       or new.categoria_id is distinct from old.categoria_id
       or new.acudientes_ids is distinct from old.acudientes_ids
    then
      raise exception 'Solo puedes actualizar foto, documentos y seguro médico de una solicitud pendiente';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists b_restringir on public.ninos;
create trigger b_restringir before update on public.ninos
  for each row execute function public.b_ninos_restringir();

-- notificaciones: el usuario solo marca `leida`.
create or replace function public.b_notificaciones_restringir()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is not null then
    if (new.datos - 'leida') is distinct from (old.datos - 'leida')
       or new.usuario_id is distinct from old.usuario_id
       or new.fecha is distinct from old.fecha
    then
      raise exception 'Solo puedes marcar la notificación como leída';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists b_restringir on public.notificaciones;
create trigger b_restringir before update on public.notificaciones
  for each row execute function public.b_notificaciones_restringir();

-- confirmaciones_evento y solicitudes_cambio: si no es entrenador, el servidor
-- fija acudientes_ids (y datos.acudientesIds) con los del niño; el padre no puede falsearlos.
create or replace function public.b_fijar_acudientes_desde_nino()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is not null and not public.es_entrenador() then
    new.acudientes_ids := public.acudientes_de_nino(new.nino_id);
    new.datos := jsonb_set(
      new.datos, '{acudientesIds}',
      to_jsonb(coalesce(new.acudientes_ids, '{}'::uuid[])), true
    );
  end if;
  return new;
end;
$$;
drop trigger if exists b_fijar_acudientes on public.confirmaciones_evento;
create trigger b_fijar_acudientes before insert or update on public.confirmaciones_evento
  for each row execute function public.b_fijar_acudientes_desde_nino();
drop trigger if exists b_fijar_acudientes on public.solicitudes_cambio;
create trigger b_fijar_acudientes before insert or update on public.solicitudes_cambio
  for each row execute function public.b_fijar_acudientes_desde_nino();

-- ---------------------------------------------------------------------
-- 4. Concesiones (las políticas RLS hacen el filtrado real)
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  todas text[] := array[
    'usuarios','ninos','categorias','sesiones','pruebas','plantillas_control',
    'medios_pago','eventos','anuncios','configuracion','asistencias',
    'mediciones_fisicas','pagos','resultados_pruebas','confirmaciones_evento',
    'solicitudes_cambio','invitaciones','notificaciones'
  ];
begin
  foreach t in array todas loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from authenticated', t);
  end loop;
end $$;

grant select, insert, update, delete on
  public.categorias, public.sesiones, public.pruebas, public.plantillas_control,
  public.medios_pago, public.eventos, public.anuncios, public.configuracion,
  public.asistencias, public.mediciones_fisicas, public.pagos, public.resultados_pruebas
  to authenticated;
grant select, insert, update on
  public.usuarios, public.ninos, public.confirmaciones_evento,
  public.solicitudes_cambio, public.notificaciones
  to authenticated;
grant select, insert, delete on public.invitaciones to authenticated;

-- ---------------------------------------------------------------------
-- 5. Políticas RLS
-- ---------------------------------------------------------------------

-- 5.1 Catálogos: leen todos los autenticados, escribe el entrenador.
do $$
declare t text;
begin
  foreach t in array array['categorias','sesiones','pruebas','medios_pago','eventos','anuncios','configuracion'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) is not null)', t || '_select', t);
  end loop;
  foreach t in array array['categorias','sesiones','pruebas','medios_pago','eventos','anuncios','configuracion','plantillas_control','asistencias','mediciones_fisicas','pagos'] loop
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.es_entrenador())', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.es_entrenador()) with check (public.es_entrenador())', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.es_entrenador())', t || '_delete', t);
  end loop;
end $$;

-- plantillas_control: lectura solo entrenador.
drop policy if exists plantillas_control_select on public.plantillas_control;
create policy plantillas_control_select on public.plantillas_control
  for select to authenticated using (public.es_entrenador());

-- 5.2 Datos por niño: lee entrenador o acudiente.
do $$
declare t text;
begin
  foreach t in array array['asistencias','mediciones_fisicas','pagos','resultados_pruebas','confirmaciones_evento','solicitudes_cambio'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.es_entrenador() or (select auth.uid()) = any (acudientes_ids))',
      t || '_select', t);
  end loop;
end $$;

-- 5.3 usuarios
drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios
  for select to authenticated
  using (id = (select auth.uid()) or public.es_entrenador());

drop policy if exists usuarios_insert on public.usuarios;
create policy usuarios_insert on public.usuarios
  for insert to authenticated
  with check (id = (select auth.uid()) and rol = 'padre' and estado = 'activo');

drop policy if exists usuarios_update on public.usuarios;
create policy usuarios_update on public.usuarios
  for update to authenticated
  using (public.es_entrenador() or id = (select auth.uid()))
  with check (public.es_entrenador() or id = (select auth.uid()));

-- 5.4 ninos (sin delete: nadie borra niños)
drop policy if exists ninos_select on public.ninos;
create policy ninos_select on public.ninos
  for select to authenticated
  using (public.es_entrenador() or (select auth.uid()) = any (acudientes_ids));

drop policy if exists ninos_insert on public.ninos;
create policy ninos_insert on public.ninos
  for insert to authenticated
  with check (
    public.es_entrenador()
    or (
      estado = 'pendiente_aprobacion'
      and acudientes_ids = array[(select auth.uid())]
      and (datos -> 'acudientesIds') = jsonb_build_array((select auth.uid())::text)
      and categoria_id is null
      and (datos -> 'categoriaId') is null
      and (datos -> 'descuento') is null
      and (datos -> 'fechaInscripcion') is null
    )
  );

drop policy if exists ninos_update on public.ninos;
create policy ninos_update on public.ninos
  for update to authenticated
  using (
    public.es_entrenador()
    or ((select auth.uid()) = any (acudientes_ids) and estado = 'pendiente_aprobacion')
  )
  with check (
    public.es_entrenador()
    or ((select auth.uid()) = any (acudientes_ids) and estado = 'pendiente_aprobacion')
  );

-- 5.5 resultados_pruebas: CA-08 (sin autorización de imagen no hay fotos ni videos)
drop policy if exists resultados_pruebas_insert on public.resultados_pruebas;
create policy resultados_pruebas_insert on public.resultados_pruebas
  for insert to authenticated
  with check (
    public.es_entrenador()
    and (
      jsonb_array_length(coalesce(datos -> 'medios', '[]'::jsonb)) = 0
      or public.nino_autoriza_imagen(nino_id)
    )
  );

drop policy if exists resultados_pruebas_update on public.resultados_pruebas;
create policy resultados_pruebas_update on public.resultados_pruebas
  for update to authenticated
  using (public.es_entrenador())
  with check (
    public.es_entrenador()
    and (
      jsonb_array_length(coalesce(datos -> 'medios', '[]'::jsonb)) = 0
      or public.nino_autoriza_imagen(nino_id)
    )
  );

drop policy if exists resultados_pruebas_delete on public.resultados_pruebas;
create policy resultados_pruebas_delete on public.resultados_pruebas
  for delete to authenticated using (public.es_entrenador());

-- 5.6 confirmaciones_evento (sin delete)
drop policy if exists confirmaciones_evento_insert on public.confirmaciones_evento;
create policy confirmaciones_evento_insert on public.confirmaciones_evento
  for insert to authenticated
  with check (
    public.es_entrenador()
    or (
      public.es_acudiente_de_nino(nino_id)
      and datos ->> 'respondidoPor' = (select auth.uid())::text
      and datos ->> 'respuesta' in ('asistira', 'no_asistira')
    )
  );

drop policy if exists confirmaciones_evento_update on public.confirmaciones_evento;
create policy confirmaciones_evento_update on public.confirmaciones_evento
  for update to authenticated
  using (public.es_entrenador() or (select auth.uid()) = any (acudientes_ids))
  with check (
    public.es_entrenador()
    or (
      public.es_acudiente_de_nino(nino_id)
      and datos ->> 'respondidoPor' = (select auth.uid())::text
      and datos ->> 'respuesta' in ('asistira', 'no_asistira')
    )
  );

-- 5.7 solicitudes_cambio (CA-07): crea el acudiente, resuelve el entrenador
drop policy if exists solicitudes_cambio_insert on public.solicitudes_cambio;
create policy solicitudes_cambio_insert on public.solicitudes_cambio
  for insert to authenticated
  with check (
    public.es_acudiente_de_nino(nino_id)
    and solicitado_por = (select auth.uid())
    and estado = 'pendiente'
  );

drop policy if exists solicitudes_cambio_update on public.solicitudes_cambio;
create policy solicitudes_cambio_update on public.solicitudes_cambio
  for update to authenticated
  using (public.es_entrenador())
  with check (public.es_entrenador());

-- 5.8 invitaciones (sin update, igual que Firestore)
drop policy if exists invitaciones_select on public.invitaciones;
create policy invitaciones_select on public.invitaciones
  for select to authenticated
  using (
    public.es_entrenador()
    or invitado_por = (select auth.uid())
    or lower(correo) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  );

drop policy if exists invitaciones_insert on public.invitaciones;
create policy invitaciones_insert on public.invitaciones
  for insert to authenticated
  with check (
    public.es_entrenador()
    or (
      invitado_por = (select auth.uid())
      and estado = 'pendiente'
      and coalesce(array_length(ninos_ids, 1), 0) between 1 and 5
      and public.es_acudiente_de_nino(ninos_ids[1])
    )
  );

drop policy if exists invitaciones_delete on public.invitaciones;
create policy invitaciones_delete on public.invitaciones
  for delete to authenticated
  using (public.es_entrenador() or invitado_por = (select auth.uid()));

-- 5.9 notificaciones: ve y marca leídas las propias; crea el entrenador.
-- (Las funciones/triggers security definer y el service role omiten RLS.)
drop policy if exists notificaciones_select on public.notificaciones;
create policy notificaciones_select on public.notificaciones
  for select to authenticated using (usuario_id = (select auth.uid()));

drop policy if exists notificaciones_update on public.notificaciones;
create policy notificaciones_update on public.notificaciones
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

drop policy if exists notificaciones_insert on public.notificaciones;
create policy notificaciones_insert on public.notificaciones
  for insert to authenticated with check (public.es_entrenador());

-- ---------------------------------------------------------------------
-- 6. Storage: buckets privados y políticas
--    Los límites de tamaño y tipo se aplican en el bucket (no en la política,
--    porque el tamaño/tipo no es fiable dentro del WITH CHECK al insertar).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('ninos',      'ninos',      false, 5242880,  array['image/*', 'application/pdf']),
  ('resultados', 'resultados', false, 20971520, array['image/*', 'video/*']),
  ('publico',    'publico',    false, 10485760, array['image/*'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ninos/{ninoId}/...  (el nombre del objeto dentro del bucket es {ninoId}/...)
drop policy if exists "ninos_leer" on storage.objects;
create policy "ninos_leer" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ninos'
    and (public.es_entrenador() or public.es_acudiente_de_nino((storage.foldername(name))[1]))
  );

drop policy if exists "ninos_subir" on storage.objects;
create policy "ninos_subir" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ninos'
    and (
      public.es_entrenador()
      or (
        public.es_acudiente_de_nino((storage.foldername(name))[1])
        and public.nino_pendiente((storage.foldername(name))[1])
      )
    )
  );

drop policy if exists "ninos_actualizar" on storage.objects;
create policy "ninos_actualizar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'ninos'
    and (
      public.es_entrenador()
      or (
        public.es_acudiente_de_nino((storage.foldername(name))[1])
        and public.nino_pendiente((storage.foldername(name))[1])
      )
    )
  )
  with check (
    bucket_id = 'ninos'
    and (
      public.es_entrenador()
      or (
        public.es_acudiente_de_nino((storage.foldername(name))[1])
        and public.nino_pendiente((storage.foldername(name))[1])
      )
    )
  );

drop policy if exists "ninos_borrar" on storage.objects;
create policy "ninos_borrar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ninos'
    and (
      public.es_entrenador()
      or (
        public.es_acudiente_de_nino((storage.foldername(name))[1])
        and public.nino_pendiente((storage.foldername(name))[1])
      )
    )
  );

-- resultados/{ninoId}/...  (CA-08, RNF-03)
drop policy if exists "resultados_leer" on storage.objects;
create policy "resultados_leer" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resultados'
    and (public.es_entrenador() or public.es_acudiente_de_nino((storage.foldername(name))[1]))
  );

drop policy if exists "resultados_subir" on storage.objects;
create policy "resultados_subir" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'resultados'
    and public.es_entrenador()
    and public.nino_autoriza_imagen((storage.foldername(name))[1])
  );

drop policy if exists "resultados_actualizar" on storage.objects;
create policy "resultados_actualizar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'resultados'
    and public.es_entrenador()
    and public.nino_autoriza_imagen((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'resultados'
    and public.es_entrenador()
    and public.nino_autoriza_imagen((storage.foldername(name))[1])
  );

drop policy if exists "resultados_borrar" on storage.objects;
create policy "resultados_borrar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'resultados'
    and public.es_entrenador()
    and public.nino_autoriza_imagen((storage.foldername(name))[1])
  );

-- publico/...  (QR de pagos, imágenes de anuncios/eventos)
drop policy if exists "publico_leer" on storage.objects;
create policy "publico_leer" on storage.objects
  for select to authenticated
  using (bucket_id = 'publico');

drop policy if exists "publico_subir" on storage.objects;
create policy "publico_subir" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'publico' and public.es_entrenador());

drop policy if exists "publico_actualizar" on storage.objects;
create policy "publico_actualizar" on storage.objects
  for update to authenticated
  using (bucket_id = 'publico' and public.es_entrenador())
  with check (bucket_id = 'publico' and public.es_entrenador());

drop policy if exists "publico_borrar" on storage.objects;
create policy "publico_borrar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'publico' and public.es_entrenador());
