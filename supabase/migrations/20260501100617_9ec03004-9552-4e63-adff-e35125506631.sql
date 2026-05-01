-- 1. Create admins table
CREATE TABLE public.admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  auth_method TEXT NOT NULL DEFAULT 'both' CHECK (auth_method IN ('google', 'password', 'both')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_login TIMESTAMPTZ,
  created_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Normalize email to lowercase
CREATE OR REPLACE FUNCTION public.lowercase_admin_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.email := lower(NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER admins_lowercase_email
BEFORE INSERT OR UPDATE ON public.admins
FOR EACH ROW EXECUTE FUNCTION public.lowercase_admin_email();

CREATE TRIGGER admins_set_updated_at
BEFORE UPDATE ON public.admins
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Migrate existing hr_whitelist entries
INSERT INTO public.admins (name, email, role, auth_method, status)
SELECT 
  split_part(email, '@', 1) AS name,
  lower(email),
  'admin',
  'both',
  'active'
FROM public.hr_whitelist
ON CONFLICT (email) DO NOTHING;

-- 3. Seed bootstrap super admin
INSERT INTO public.admins (name, email, role, auth_method, status)
VALUES ('Aman (Super Admin)', 'amanvibesonlovable.com', 'super_admin', 'both', 'active')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin', status = 'active';

-- 4. Security definer functions
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins a
    JOIN auth.users u ON lower(u.email) = a.email
    WHERE u.id = auth.uid()
      AND a.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins a
    JOIN auth.users u ON lower(u.email) = a.email
    WHERE u.id = auth.uid()
      AND a.status = 'active'
      AND a.role = 'super_admin'
  );
$$;

-- Update existing is_hr_user to also accept admins table
CREATE OR REPLACE FUNCTION public.is_hr_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_admin();
$$;

-- 5. RLS on admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active admins can view all admins"
ON public.admins FOR SELECT
TO authenticated
USING (public.is_active_admin());

CREATE POLICY "Super admins can insert admins"
ON public.admins FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update admins"
ON public.admins FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete admins"
ON public.admins FOR DELETE
TO authenticated
USING (public.is_super_admin());

-- Allow self-update of last_login (called from client after login)
CREATE POLICY "Users can update own last_login"
ON public.admins FOR UPDATE
TO authenticated
USING (lower((SELECT email FROM auth.users WHERE id = auth.uid())) = email)
WITH CHECK (lower((SELECT email FROM auth.users WHERE id = auth.uid())) = email);
