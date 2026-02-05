
-- FINANCIAL MANAGEMENT SYSTEM (FMS) DATABASE SETUP

-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    priority TEXT DEFAULT 'Medium',
    "isRead" BOOLEAN DEFAULT FALSE,
    link TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own" ON public.notifications FOR SELECT USING (auth.uid() = "userId");
CREATE POLICY "Users can update own" ON public.notifications FOR UPDATE USING (auth.uid() = "userId");
CREATE POLICY "Authenticated can insert" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. Users / Profiles Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'Project Manager',
    status TEXT DEFAULT 'Active',
    phone TEXT,
    "teamId" UUID,
    "lastLogin" TIMESTAMPTZ,
    privileges TEXT[] DEFAULT '{}',
    "notificationPreferences" JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 3. TRIGGER FUNCTION FOR NEW USERS
-- Automatically syncs Auth users to the public table and creates a welcome notification
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the profile row
  INSERT INTO public.users (id, name, email, role, status, active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Valued Member'),
    new.email,
    'Project Manager', 
    'Active',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert the welcome notification
  INSERT INTO public.notifications ("userId", title, message, type, priority, "isRead", timestamp)
  VALUES (
    new.id,
    'Welcome to FMS',
    'Your financial account has been initialized.',
    'System',
    'Low',
    false,
    NOW()
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger deployment: CRITICAL to use DROP TRIGGER IF EXISTS to prevent creation errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Push Subscribers (Optional Helper)
CREATE TABLE IF NOT EXISTS public.push_subscribers (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscriber_id TEXT NOT NULL,
    platform TEXT DEFAULT 'sendpulse',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, subscriber_id)
);
