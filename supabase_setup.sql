
-- --- COSTPILOT: ATOMIC IDENTITY REGISTRY ---
-- PURPOSE: Eliminate RLS recursion via JWT Metadata Claims

-- 1. CLEANUP PREVIOUS POLICIES
DROP POLICY IF EXISTS "Registry: Public Read" ON public.users;
DROP POLICY IF EXISTS "Registry: Agent Update" ON public.users;
DROP POLICY IF EXISTS "Registry: Admin Insert" ON public.users;
DROP POLICY IF EXISTS "Registry: Admin Authority" ON public.users;
DROP POLICY IF EXISTS "Registry: Admin Delete" ON public.users;

-- 2. JWT-BASED SECURITY GATEKEEPER
-- Reads role directly from JWT user_metadata. 
-- This does NOT query the users table, preventing recursion loops.
CREATE OR REPLACE FUNCTION public.is_registry_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin';
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. APPLY OPTIMIZED SECURITY POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read the registry
CREATE POLICY "Registry: Public Read" ON public.users 
    FOR SELECT TO authenticated USING (true);

-- Admins can do anything (checked via JWT metadata)
CREATE POLICY "Registry: Admin Authority" ON public.users
    FOR ALL TO authenticated
    USING (is_registry_admin())
    WITH CHECK (is_registry_admin());

-- Users can update their own non-sensitive details
CREATE POLICY "Registry: Self Update" ON public.users 
    FOR UPDATE TO authenticated 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

-- 4. IDENTITY SYNC TRIGGER
-- Syncs Auth data to Public Profile including the role
CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, status, active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'New Agent'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'Project Manager'), 
    'Active',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.sync_user_profile();
