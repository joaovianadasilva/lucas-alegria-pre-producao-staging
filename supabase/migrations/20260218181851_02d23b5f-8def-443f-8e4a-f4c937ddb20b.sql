INSERT INTO public.user_roles (user_id, role)
VALUES ('d616014a-31e1-4f9a-928a-01ac74ccfbc0', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;