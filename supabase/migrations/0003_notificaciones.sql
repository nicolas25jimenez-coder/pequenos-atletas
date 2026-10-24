-- =====================================================================
-- Pequeños Atletas — 0003_notificaciones.sql
-- Campanita (bandeja interna): helper notificar() y triggers que reemplazan
-- las Cloud Functions de Firebase (functions/src/index.ts y notificar.ts).
-- Sin push/FCM. Ejecutar DESPUÉS de 0001 y 0002. Idempotente.
-- Los triggers se llaman "c_..." para correr después de "a_derivar" y "b_...".
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Utilidades de formato (equivalen a fechaChip, hora12, nombreMes, cop)
-- ---------------------------------------------------------------------
create or replace function public.pa_fecha_chip(f text)
returns text
language sql immutable
set search_path = public
as $$
  select (array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'])[extract(isodow from left(f, 10)::date)::int]
    || ' ' || extract(day from left(f, 10)::date)::int::text
    || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from left(f, 10)::date)::int];
$$;

create or replace function public.pa_hora12(hhmm text)
returns text
language sql immutable
set search_path = public
as $$
  select (case when split_part(hhmm, ':', 1)::int % 12 = 0 then 12 else split_part(hhmm, ':', 1)::int % 12 end)::text
    || ':' || lpad(split_part(hhmm, ':', 2)::int::text, 2, '0')
    || ' ' || (case when split_part(hhmm, ':', 1)::int >= 12 then 'p.m.' else 'a.m.' end);
$$;

-- '$ 1.234.567' (puntos de miles, igual que cop() en la app)
create or replace function public.pa_cop(n numeric)
returns text
language sql immutable
set search_path = public
as $$
  select '$ ' || replace(to_char(round(coalesce(n, 0)), 'FM999,999,999,999'), ',', '.');
$$;

-- '2026-10' -> 'octubre' (en minúscula, como nombreMes(...).toLowerCase())
create or replace function public.pa_nombre_mes_min(periodo text)
returns text
language sql immutable
set search_path = public
as $$
  select (array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'])
    [split_part(periodo, '-', 2)::int];
$$;

-- ---------------------------------------------------------------------
-- 2. Helper notificar(): inserta en la bandeja respetando preferencias
-- ---------------------------------------------------------------------
create or replace function public.notificar(
  usuarios uuid[], tipo text, titulo text, cuerpo text, enlace text default null
)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_ids uuid[] := usuarios;
  v_tipo text := tipo;
  v_titulo text := titulo;
  v_cuerpo text := cuerpo;
  v_enlace text := enlace;
  v_clave text;
  v_fecha text := to_char(now() at time zone 'America/Bogota', 'YYYY-MM-DD"T"HH24:MI:00"-05:00"');
  v_n integer := 0;
  r record;
begin
  v_clave := case v_tipo
    when 'pago_registrado' then 'pagoRegistrado'
    when 'inasistencia' then 'inasistencia'
    when 'resultados' then 'resultados'
    when 'evento_proximo' then 'eventos'
    when 'confirmar_evento' then 'eventos'
    when 'solicitud_resuelta' then 'solicitudes'
    when 'resumen_vencidos' then 'pagoRegistrado'
    else null
  end;

  for r in
    select u.id, u.datos
    from public.usuarios u
    where u.id in (select distinct x from unnest(v_ids) as x where x is not null)
  loop
    if v_clave is not null and (r.datos -> 'preferenciasNotificacion' ->> v_clave) = 'false' then
      continue;
    end if;
    insert into public.notificaciones (id, datos, usuario_id, leida, fecha)
    values (
      gen_random_uuid()::text,
      jsonb_build_object(
        'usuarioId', r.id,
        'tipo', v_tipo,
        'titulo', v_titulo,
        'cuerpo', v_cuerpo,
        'enlace', v_enlace,
        'leida', false,
        'fecha', v_fecha
      ),
      r.id, false, v_fecha
    );
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

create or replace function public.ids_entrenador()
returns uuid[]
language sql stable security definer
set search_path = public
as $$
  select coalesce(array_agg(u.id), '{}'::uuid[]) from public.usuarios u where u.rol = 'entrenador';
$$;

-- Solo triggers (que corren como dueño) y el service role (funciones de Netlify).
revoke execute on function public.notificar(uuid[], text, text, text, text) from public, anon, authenticated;
revoke execute on function public.ids_entrenador() from public, anon, authenticated;
grant execute on function public.notificar(uuid[], text, text, text, text) to service_role;
grant execute on function public.ids_entrenador() to service_role;

-- ---------------------------------------------------------------------
-- 3. Inscripciones (N11, N13)
-- ---------------------------------------------------------------------
create or replace function public.c_ninos_al_crear()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.estado is distinct from 'pendiente_aprobacion' then
    return null;
  end if;
  perform public.notificar(
    public.ids_entrenador(), 'nueva_inscripcion', 'Nueva inscripción',
    (new.datos ->> 'nombres') || ' ' || (new.datos ->> 'apellidos') || ' espera tu aprobación.',
    '/e/inscripciones/' || new.id
  );
  return null;
end;
$$;
drop trigger if exists c_ninos_crear on public.ninos;
create trigger c_ninos_crear after insert on public.ninos
  for each row execute function public.c_ninos_al_crear();

create or replace function public.c_ninos_al_actualizar()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_cat text;
  v_motivo text;
begin
  if old.estado is distinct from 'pendiente_aprobacion' then
    return null;
  end if;
  if new.estado = 'activo' then
    if new.categoria_id is not null then
      select c.datos ->> 'nombre' into v_cat from public.categorias c where c.id = new.categoria_id;
    end if;
    perform public.notificar(
      new.acudientes_ids, 'inscripcion_resuelta',
      '¡Bienvenido, ' || (new.datos ->> 'nombres') || '! 🎉',
      'La inscripción fue aprobada'
        || case when v_cat is not null then ' en la categoría ' || v_cat else '' end
        || '. Ya puedes ver su perfil, horarios y pagos.',
      '/p/hijo?nino=' || new.id
    );
  elsif new.estado = 'rechazado' then
    v_motivo := nullif(new.datos ->> 'motivoRechazo', '');
    perform public.notificar(
      new.acudientes_ids, 'inscripcion_resuelta', 'Inscripción no aprobada',
      'La inscripción de ' || (new.datos ->> 'nombres') || ' no fue aprobada'
        || case when v_motivo is not null then ': ' || v_motivo else '' end || '.',
      '/p/mas'
    );
  end if;
  return null;
end;
$$;
drop trigger if exists c_ninos_actualizar on public.ninos;
create trigger c_ninos_actualizar after update on public.ninos
  for each row execute function public.c_ninos_al_actualizar();

-- ---------------------------------------------------------------------
-- 4. Asistencia (N05)
-- ---------------------------------------------------------------------
create or replace function public.c_asistencias_al_guardar()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_fecha text;
  v_nombres text;
  v_ses_fecha text;
  v_ses_hora text;
  v_ses_tipo text;
  v_existe boolean;
  v_tipo text;
begin
  if new.estado is distinct from 'falto' then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.estado is not distinct from 'falto' then
    return null;
  end if;
  -- no se avisan faltas antiguas (correcciones del historial)
  v_fecha := coalesce(new.datos ->> 'fecha', new.fecha);
  if v_fecha is not null
     and ((now() at time zone 'America/Bogota')::date - left(v_fecha, 10)::date) > 2 then
    return null;
  end if;

  select n.datos ->> 'nombres' into v_nombres from public.ninos n where n.id = new.nino_id;
  if not found then return null; end if;
  select s.datos ->> 'fecha', s.datos ->> 'horaInicio', s.datos ->> 'tipo'
    into v_ses_fecha, v_ses_hora, v_ses_tipo
    from public.sesiones s where s.id = new.sesion_id;
  if not found then return null; end if;

  v_tipo := case when v_ses_tipo = 'control' then 'al día de control' else 'al entrenamiento' end;
  perform public.notificar(
    new.acudientes_ids, 'inasistencia', v_nombres || ' no asistió',
    public.pa_fecha_chip(v_ses_fecha) || ': ' || v_nombres || ' no asistió ' || v_tipo
      || ' de las ' || public.pa_hora12(v_ses_hora)
      || ' Si fue por una razón justificada, avísale al entrenador.',
    '/p/asistencia?nino=' || new.nino_id
  );
  return null;
end;
$$;
drop trigger if exists c_asistencias_guardar on public.asistencias;
create trigger c_asistencias_guardar after insert or update on public.asistencias
  for each row execute function public.c_asistencias_al_guardar();

-- ---------------------------------------------------------------------
-- 5. Sesiones: cancelación (N10) y resultados (N06)
-- ---------------------------------------------------------------------
create or replace function public.c_sesiones_al_actualizar()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_acud uuid[];
  v_motivo text;
  r record;
begin
  if old.estado is distinct from 'cancelada' and new.estado = 'cancelada' then
    select coalesce(array_agg(a), '{}'::uuid[]) into v_acud
      from public.ninos n, unnest(n.acudientes_ids) as a
      where n.categoria_id = new.categoria_id and n.estado = 'activo';
    v_motivo := nullif(new.datos ->> 'motivoCancelacion', '');
    perform public.notificar(
      v_acud, 'sesion_cancelada', 'Sesión cancelada',
      'La sesión del ' || public.pa_fecha_chip(new.datos ->> 'fecha')
        || ' (' || public.pa_hora12(new.datos ->> 'horaInicio') || ') fue cancelada'
        || case when v_motivo is not null then ': ' || v_motivo else '' end || '.',
      '/p/asistencia'
    );
  end if;

  if coalesce(old.datos ->> 'resultadosGuardados', 'false') <> 'true'
     and coalesce(new.datos ->> 'resultadosGuardados', 'false') = 'true' then
    for r in
      select distinct on (rp.nino_id) rp.nino_id, rp.acudientes_ids
      from public.resultados_pruebas rp
      where rp.sesion_id = new.id
        and coalesce(rp.datos ->> 'noRealizada', 'false') <> 'true'
      order by rp.nino_id
    loop
      perform public.notificar(
        r.acudientes_ids, 'resultados',
        '🏅 ¡Nuevos resultados de '
          || coalesce((select n.datos ->> 'nombres' from public.ninos n where n.id = r.nino_id), 'tu hijo') || '!',
        'Ya están los resultados del día de control. Mira su progreso.',
        '/p/hijo/pruebas?nino=' || r.nino_id
      );
    end loop;
  end if;
  return null;
end;
$$;
drop trigger if exists c_sesiones_actualizar on public.sesiones;
create trigger c_sesiones_actualizar after update on public.sesiones
  for each row execute function public.c_sesiones_al_actualizar();

-- ---------------------------------------------------------------------
-- 6. Pagos (N04)
-- ---------------------------------------------------------------------
create or replace function public.c_pagos_al_actualizar()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_nombres text;
begin
  if old.estado is not distinct from 'pagado' or new.estado is distinct from 'pagado' then
    return null;
  end if;
  select n.datos ->> 'nombres' into v_nombres from public.ninos n where n.id = new.nino_id;
  perform public.notificar(
    new.acudientes_ids, 'pago_registrado', 'Pago registrado ✅',
    'Recibimos el pago de ' || public.pa_nombre_mes_min(coalesce(new.periodo, new.datos ->> 'periodo'))
      || ' de ' || coalesce(v_nombres, 'tu hijo')
      || ' por ' || public.pa_cop(coalesce((new.datos ->> 'valorAPagar')::numeric, 0))
      || '. ¡Gracias!',
    '/p/pagos?nino=' || new.nino_id
  );
  return null;
end;
$$;
drop trigger if exists c_pagos_actualizar on public.pagos;
create trigger c_pagos_actualizar after update on public.pagos
  for each row execute function public.c_pagos_al_actualizar();

-- ---------------------------------------------------------------------
-- 7. Solicitudes de cambio (N12, N14)
-- ---------------------------------------------------------------------
create or replace function public.c_solicitudes_al_crear()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.notificar(
    public.ids_entrenador(), 'nueva_solicitud', 'Solicitud de cambio',
    coalesce(new.datos ->> 'solicitadoPorNombre', '') || ': ' || coalesce(new.datos ->> 'etiqueta', '') || '.',
    '/e/solicitudes'
  );
  return null;
end;
$$;
drop trigger if exists c_solicitudes_crear on public.solicitudes_cambio;
create trigger c_solicitudes_crear after insert on public.solicitudes_cambio
  for each row execute function public.c_solicitudes_al_crear();

create or replace function public.c_solicitudes_al_resolver()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_ok boolean;
  v_coment text;
begin
  if old.estado is distinct from 'pendiente' or new.estado is not distinct from 'pendiente' then
    return null;
  end if;
  v_ok := new.estado = 'aprobado';
  v_coment := nullif(new.datos ->> 'comentarioEntrenador', '');
  perform public.notificar(
    array[new.solicitado_por], 'solicitud_resuelta',
    case when v_ok then 'Cambio aprobado' else 'Cambio no aprobado' end,
    coalesce(new.datos ->> 'etiqueta', '') || ': '
      || case when v_ok then 'ahora es “' || coalesce(new.datos ->> 'valorPropuesto', '') || '”'
              else 'se mantiene el valor actual' end
      || '.'
      || case when v_coment is not null then ' ' || v_coment else '' end,
    '/p/hijo?nino=' || new.nino_id
  );
  return null;
end;
$$;
drop trigger if exists c_solicitudes_resolver on public.solicitudes_cambio;
create trigger c_solicitudes_resolver after update on public.solicitudes_cambio
  for each row execute function public.c_solicitudes_al_resolver();

-- ---------------------------------------------------------------------
-- 8. Anuncios (N09)
-- ---------------------------------------------------------------------
create or replace function public.c_anuncios_al_crear()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_tipo text := new.datos -> 'destinatarios' ->> 'tipo';
  v_ids text[];
  v_acud uuid[];
begin
  if coalesce(new.datos ->> 'enviarPush', 'false') <> 'true' then
    return null;
  end if;
  select coalesce(array_agg(x), '{}'::text[]) into v_ids
    from jsonb_array_elements_text(
      case when jsonb_typeof(new.datos -> 'destinatarios' -> 'ids') = 'array'
           then new.datos -> 'destinatarios' -> 'ids' else '[]'::jsonb end
    ) as x;

  select coalesce(array_agg(a), '{}'::uuid[]) into v_acud
    from public.ninos n, unnest(n.acudientes_ids) as a
    where n.estado = 'activo'
      and (
        v_tipo = 'todas'
        or (v_tipo = 'categorias' and coalesce(n.categoria_id, '') = any (v_ids))
        or (v_tipo = 'ninos' and n.id = any (v_ids))
      );

  perform public.notificar(
    v_acud, 'anuncio', new.datos ->> 'titulo', new.datos ->> 'mensaje', '/p/anuncios'
  );
  return null;
end;
$$;
drop trigger if exists c_anuncios_crear on public.anuncios;
create trigger c_anuncios_crear after insert on public.anuncios
  for each row execute function public.c_anuncios_al_crear();
