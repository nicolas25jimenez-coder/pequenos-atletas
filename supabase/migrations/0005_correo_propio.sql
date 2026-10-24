-- 0005: el correo guardado al crear el perfil debe ser el de la cuenta (evita reclamar invitaciones ajenas)
drop policy if exists usuarios_insert on public.usuarios;
create policy usuarios_insert on public.usuarios
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and rol = 'padre'
    and estado = 'activo'
    and lower(coalesce(datos->>'correo', '')) = lower(coalesce((select auth.jwt())->>'email', ''))
  );
