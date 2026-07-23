begin;

-- O UUID do perfil é gerado no navegador com crypto.randomUUID() antes do
-- upload. Assim o objeto já nasce no caminho seguro:
-- {auth_user_id}/{face_profile_id}/{image_uuid}.jpg
grant insert (id) on public.face_profiles to authenticated;

commit;
