-- Local synthetic tenants only. Do not use these credentials in hosted environments.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-0000000000a2',
    'authenticated',
    'authenticated',
    'owner-a@blueprint.test',
    extensions.crypt('blueprint-local-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-0000000000b2',
    'authenticated',
    'authenticated',
    'owner-b@blueprint.test',
    extensions.crypt('blueprint-local-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into auth.identities (
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values
  (
    '00000000-0000-4000-8000-0000000000a2',
    '00000000-0000-4000-8000-0000000000a2',
    jsonb_build_object(
      'sub', '00000000-0000-4000-8000-0000000000a2',
      'email', 'owner-a@blueprint.test',
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-0000000000b2',
    '00000000-0000-4000-8000-0000000000b2',
    jsonb_build_object(
      'sub', '00000000-0000-4000-8000-0000000000b2',
      'email', 'owner-b@blueprint.test',
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  );

insert into public.companies (id, name) values
  ('00000000-0000-4000-8000-0000000000a1', 'Company A'),
  ('00000000-0000-4000-8000-0000000000b1', 'Company B');

insert into public.company_memberships (company_id, user_id, role, status) values
  (
    '00000000-0000-4000-8000-0000000000a1',
    '00000000-0000-4000-8000-0000000000a2',
    'owner_admin',
    'active'
  ),
  (
    '00000000-0000-4000-8000-0000000000b1',
    '00000000-0000-4000-8000-0000000000b2',
    'owner_admin',
    'active'
  );
