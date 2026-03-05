
-- Table order and constraints may not be valid for execution.
-- Note: Fixed invalid 'ARRAY' types to 'TEXT[]' for Postgres compatibility.
-- Note: Using double quotes for camelCase identifiers to ensure Postgres compatibility.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up to ensure fresh state
DROP TABLE IF EXISTS public.receipts CASCADE;
DROP TABLE IF EXISTS public.push_subscribers CASCADE;
DROP TABLE IF EXISTS public.progress_updates CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.financial_projects CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

CREATE TABLE public.teams (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    "memberIds" text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    name text,
    phone text,
    role text DEFAULT 'Project Manager'::text,
    status text DEFAULT 'Active'::text,
    "teamId" uuid REFERENCES public.teams(id),
    "notificationPreferences" jsonb DEFAULT '{}'::jsonb,
    "lastLogin" timestamp with time zone,
    privileges text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.activities (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    action text,
    details text,
    "user" jsonb,
    timestamp timestamp with time zone DEFAULT now()
);

CREATE TABLE public.departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    budget_cap numeric DEFAULT 0
);

CREATE TABLE public.financial_projects (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text,
    "estimatedBudget" numeric,
    "approvedBudget" numeric,
    status text,
    "rejectionReason" text,
    tasks jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.projects (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    "startDate" date,
    "endDate" date,
    "teamLeader" jsonb,
    team jsonb DEFAULT '[]'::jsonb,
    tags text[] DEFAULT '{}'::text[],
    status text DEFAULT 'Pending'::text,
    "completionPercentage" numeric DEFAULT 0,
    budget numeric DEFAULT 0,
    spent numeric DEFAULT 0,
    tasks jsonb DEFAULT '[]'::jsonb,
    expenses jsonb DEFAULT '[]'::jsonb,
    documents jsonb DEFAULT '[]'::jsonb,
    "rejectionReason" text,
    "isAccessEnabled" boolean DEFAULT true,
    "assigned_email" text,
    "notification_sent" boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" uuid REFERENCES public.users(id) ON DELETE CASCADE,
    title text,
    message text,
    type text,
    priority text,
    "isRead" boolean DEFAULT false,
    timestamp timestamp with time zone DEFAULT now(),
    link text
);

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'USER'::text CHECK (role = ANY (ARRAY['SUPER_ADMIN'::text, 'FINANCE'::text, 'USER'::text])),
    department_id uuid REFERENCES public.departments(id),
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.progress_updates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    description text NOT NULL,
    percentage integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.push_subscribers (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscriber_id text NOT NULL,
    platform text DEFAULT 'sendpulse'::text,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (user_id, subscriber_id)
);

CREATE TABLE public.receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    amount numeric DEFAULT 0,
    url text,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users: Allow read" ON public.users;
CREATE POLICY "Users: Allow read" ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users: Allow individual update" ON public.users;
CREATE POLICY "Users: Allow individual update" ON public.users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users: Allow individual insert" ON public.users;
CREATE POLICY "Users: Allow individual insert" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Projects: Allow read" ON public.projects;
CREATE POLICY "Projects: Allow read" ON public.projects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Projects: Allow insert" ON public.projects;
CREATE POLICY "Projects: Allow insert" ON public.projects FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Projects: Allow update" ON public.projects;
CREATE POLICY "Projects: Allow update" ON public.projects FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Projects: Allow delete" ON public.projects;
CREATE POLICY "Projects: Allow delete" ON public.projects FOR DELETE USING (true);

ALTER TABLE public.financial_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Financial: Allow read" ON public.financial_projects;
CREATE POLICY "Financial: Allow read" ON public.financial_projects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Financial: Allow insert" ON public.financial_projects;
CREATE POLICY "Financial: Allow insert" ON public.financial_projects FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Financial: Allow update" ON public.financial_projects;
CREATE POLICY "Financial: Allow update" ON public.financial_projects FOR UPDATE USING (true);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Activities: Allow authenticated read" ON public.activities;
CREATE POLICY "Activities: Allow authenticated read" ON public.activities FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Activities: Allow authenticated insert" ON public.activities;
CREATE POLICY "Activities: Allow authenticated insert" ON public.activities FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notifications: Allow individual read" ON public.notifications;
CREATE POLICY "Notifications: Allow individual read" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = "userId");
DROP POLICY IF EXISTS "Notifications: Allow individual update" ON public.notifications;
CREATE POLICY "Notifications: Allow individual update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = "userId");

-- Sync Trigger
CREATE OR REPLACE FUNCTION public.sync_user_registry()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    name, 
    email, 
    role, 
    status, 
    "notificationPreferences", 
    privileges
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'Project Manager'), 
    'Active',
    '{}'::jsonb,
    '{}'::text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = CASE WHEN public.users.name IS NULL OR public.users.name = '' THEN EXCLUDED.name ELSE public.users.name END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.sync_user_registry();

