INSERT INTO public.user_roles (user_id, role)
VALUES ('70bf42d5-f395-42b8-b300-f17805e3fd62', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;