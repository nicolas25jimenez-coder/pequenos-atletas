-- =====================================================================
-- Pequeños Atletas — 0004_invitaciones.sql
-- Segundo acudiente por invitación de correo (RF-P10). Reemplaza
-- vincularInvitaciones / alCrearUsuario / alCrearInvitacion de Firebase.
-- Ejecutar DESPUÉS de 0001, 0002 y 0003. Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ajuste a b_ninos_restringir (de 0002): deja pasar a la función de sistema.
--    vincular_invitaciones() corre mientras auth.uid() es el padre que se
--    registra o que invita, y el trigger le bloquearía cambiar acudientes.
--    La función marca la transacción con la variable de sesión pa.sistema='1'
--    (set_config local) y la limpia al terminar. Un cliente no puede fijarla:
--    set_config no está expuesto por la API.
-- ---------------------------------------------------------------------
create or replace function public.b_ninos_restringir()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  permitidos text[] := array['fotoRuta','documentos','seguroMedico','actualizadoEn'];
begin
  if (select auth.uid()) is not null
     and not public.es_entrenador()
     and coalesce(current_setting('pa.sistema', true), '') <> '1' then
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

-- ---------------------------------------------------------------------
-- 2. vincular_invitaciones(uid, correo)
-- ---------------------------------------------------------------------
create or replace function public.vincular_invitaciones(uid uuid, correo text)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := uid;
  v_correo text := lower(trim(correo));
  v_nombre text;
  v_ahora text := to_char(now() at time zone 'America/Bogota', 'YYYY-MM-DD"T"HH24:MI:00"-05:00"');
  v_total integer := 0;
  v_nino_id text;
  v_acud uuid[];
  v_tabla text;
  inv record;
  n record;
begin
  if v_uid is null or v_correo is null or v_correo = '' then
    return 0;
  end if;

  select nullif(trim(coalesce(u.datos ->> 'nombres', '') || ' ' || coalesce(u.datos ->> 'apellidos', '')), '')
    into v_nombre from public.usuarios u where u.id = v_uid;
  v_nombre := coalesce(v_nombre, correo);

  -- Permite que el trigger b_ninos_restringir no bloquee esta operación del sistema.
  perform set_config('pa.sistema', '1', true);

  for inv in
    select i.id, i.datos, i.ninos_ids
    from public.invitaciones i
    where lower(trim(i.correo)) = v_correo and i.estado = 'pendiente'
    order by i.creado_en
  loop
    v_total := v_total + 1;
    foreach v_nino_id in array coalesce(inv.ninos_ids, '{}'::text[]) loop
      select * into n from public.ninos x where x.id = v_nino_id for update;
      if not found or v_uid = any (coalesce(n.acudientes_ids, '{}'::uuid[])) then
        continue;
      end if;
      v_acud := coalesce(n.acudientes_ids, '{}'::uuid[]) || v_uid;

      update public.ninos set
        acudientes_ids = v_acud,
        datos = jsonb_set(
          jsonb_set(
            jsonb_set(datos, '{acudientesIds}', to_jsonb(v_acud), true),
            '{acudientes}',
            coalesce(datos -> 'acudientes', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
              'usuarioId', v_uid,
              'nombre', v_nombre,
              'parentesco', inv.datos ->> 'parentesco',
              'esPrincipal', false
            )),
            true
          ),
          '{actualizadoEn}', to_jsonb(v_ahora), true
        )
      where id = v_nino_id;

      -- Copia el acceso a los documentos ya existentes del niño.
      foreach v_tabla in array array[
        'asistencias','mediciones_fisicas','pagos','resultados_pruebas',
        'confirmaciones_evento','solicitudes_cambio'
      ] loop
        execute format(
          'update public.%I set acudientes_ids = $1, '
          'datos = jsonb_set(datos, ''{acudientesIds}'', $2, true) where nino_id = $3',
          v_tabla
        ) using v_acud, to_jsonb(v_acud), v_nino_id;
      end loop;
    end loop;

    update public.invitaciones set
      estado = 'aceptada',
      datos = datos || jsonb_build_object('estado', 'aceptada', 'actualizadoEn', v_ahora)
    where id = inv.id;
  end loop;

  perform set_config('pa.sistema', '', true);
  return v_total;
end;
$$;

revoke execute on function public.vincular_invitaciones(uuid, text) from public, anon, authenticated;
grant execute on function public.vincular_invitaciones(uuid, text) to service_role;

-- ---------------------------------------------------------------------
-- 3. Triggers
-- ---------------------------------------------------------------------
create or replace function public.c_usuarios_vincular()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_correo text := coalesce(new.datos ->> 'correo', new.correo);
begin
  if v_correo is not null and v_correo <> '' then
    perform public.vincular_invitaciones(new.id, v_correo);
  end if;
  return null;
end;
$$;
drop trigger if exists c_usuarios_vincular on public.usuarios;
create trigger c_usuarios_vincular after insert on public.usuarios
  for each row execute function public.c_usuarios_vincular();

create or replace function public.c_invitaciones_vincular()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_correo text := lower(trim(coalesce(new.datos ->> 'correo', new.correo)));
  v_uid uuid;
begin
  if v_correo is null or v_correo = '' then
    return null;
  end if;
  select u.id into v_uid from public.usuarios u
    where lower(trim(u.correo)) = v_correo
    limit 1;
  if v_uid is not null then
    perform public.vincular_invitaciones(v_uid, v_correo);
  end if;
  return null;
end;
$$;
drop trigger if exists c_invitaciones_vincular on public.invitaciones;
create trigger c_invitaciones_vincular after insert on public.invitaciones
  for each row execute function public.c_invitaciones_vincular();
