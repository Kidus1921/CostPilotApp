
import React, { useState, useEffect } from 'react';

interface SqlInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SQL_CODE = `-- --- COSTPILOT: DATABASE ATOMIC SYNC ---
-- PURPOSE: Fix Persistence Failure, RLS Recursion & Missing Columns

-- 1. INITIALIZE CORE TABLES
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'Project Manager',
    status TEXT DEFAULT 'Active',
    "teamId" UUID,
    "notificationPreferences" JSONB DEFAULT '{}'::jsonb,
    "lastLogin" TIMESTAMPTZ,
    privileges TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pending',
    "startDate" TIMESTAMPTZ DEFAULT now(),
    "endDate" TIMESTAMPTZ,
    "acceptedAt" TIMESTAMPTZ,
    "holdAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "rejectionReason" TEXT,
    budget NUMERIC DEFAULT 0,
    spent NUMERIC DEFAULT 0,
    "completionPercentage" NUMERIC DEFAULT 0,
    tasks JSONB DEFAULT '[]'::jsonb,
    expenses JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT '{}'::text[],
    team JSONB DEFAULT '[]'::jsonb,
    "teamLeader" JSONB,
    "isAccessEnabled" BOOLEAN DEFAULT true,
    "assigned_email" TEXT,
    "notification_sent" BOOLEAN DEFAULT false,
    "createdBy" UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. HARDEN USER REGISTRY
ALTER TABLE public.users ALTER COLUMN "notificationPreferences" SET DEFAULT '{}'::jsonb;
ALTER TABLE public.users ALTER COLUMN "privileges" SET DEFAULT '{}'::text[];

-- 3. HARDEN PROJECTS SCHEMA (Ensure all operational columns exist)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "holdAt" TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "budget" NUMERIC DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "spent" NUMERIC DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "completionPercentage" NUMERIC DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "tasks" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "expenses" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "documents" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "team" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "teamLeader" JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "isAccessEnabled" BOOLEAN DEFAULT true;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "assigned_email" TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "notification_sent" BOOLEAN DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "createdBy" UUID REFERENCES auth.users(id);

-- 4. HARDEN NOTIFICATIONS SCHEMA
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    priority TEXT NOT NULL,
    "isRead" BOOLEAN DEFAULT false,
    timestamp TIMESTAMPTZ DEFAULT now(),
    link TEXT
);

-- 5. HARDEN ACTIVITIES SCHEMA
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    "user" JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS "user" JSONB;

-- 6. HARDEN TEAMS SCHEMA
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    "memberIds" TEXT[] DEFAULT '{}'::text[]
);

-- 7. EMAIL LOGS SCHEMA
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email_type TEXT NOT NULL,
    status TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now()
);

-- 8. PUSH SUBSCRIBERS SCHEMA
CREATE TABLE IF NOT EXISTS public.push_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscriber_id TEXT NOT NULL,
    platform TEXT DEFAULT 'sendpulse',
    browser TEXT,
    "isEnabled" BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, subscriber_id)
);

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications("isRead");
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON public.activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_push_user_id ON public.push_subscribers(user_id);

-- 10. NON-RECURSIVE SECURITY GATEKEEPER
-- Checks the public.users table for the Admin role.
-- Uses SECURITY DEFINER to avoid RLS recursion.
CREATE OR REPLACE FUNCTION public.is_registry_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 11. APPLY POLICIES (USERS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Registry: Public Read" ON public.users;
CREATE POLICY "Registry: Public Read" ON public.users 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Registry: Self Update" ON public.users;
CREATE POLICY "Registry: Self Update" ON public.users 
    FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Registry: Admin Authority" ON public.users;
CREATE POLICY "Registry: Admin Authority" ON public.users
    FOR ALL TO authenticated
    USING (is_registry_admin());

-- 12. APPLY POLICIES (PROJECTS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Projects: Public Read" ON public.projects;
CREATE POLICY "Projects: Public Read" ON public.projects
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Projects: Authenticated Insert" ON public.projects;
CREATE POLICY "Projects: Authenticated Insert" ON public.projects
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Projects: Authenticated Update" ON public.projects;
CREATE POLICY "Projects: Authenticated Update" ON public.projects
    FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Projects: Admin Delete" ON public.projects;
CREATE POLICY "Projects: Admin Delete" ON public.projects
    FOR DELETE TO authenticated USING (is_registry_admin());

-- 13. ROBUST IDENTITY SYNC TRIGGER
CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT count(*) INTO user_count FROM public.users;
  
  INSERT INTO public.users (id, name, email, role, "notificationPreferences", privileges)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'role', 
      CASE WHEN user_count = 0 THEN 'Admin' ELSE 'Project Manager' END
    ),
    '{}'::jsonb,
    '{}'::text[]
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.sync_user_profile();

-- 14. NOTIFICATION ENGINE SECURITY
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications: Self Access" ON public.notifications;
CREATE POLICY "Notifications: Self Access" ON public.notifications
    FOR ALL TO authenticated
    USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "Notifications: System Dispatch" ON public.notifications;
CREATE POLICY "Notifications: System Dispatch" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Notifications: Registry Check" ON public.notifications;
CREATE POLICY "Notifications: Registry Check" ON public.notifications
    FOR SELECT TO authenticated
    USING (true);

-- 15. ACTIVITY LOG SECURITY
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Activities: Public Read" ON public.activities;
CREATE POLICY "Activities: Public Read" ON public.activities
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Activities: System Logging" ON public.activities;
CREATE POLICY "Activities: System Logging" ON public.activities
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 16. TEAM REGISTRY SECURITY
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teams: Public Read" ON public.teams;
CREATE POLICY "Teams: Public Read" ON public.teams
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Teams: Admin Authority" ON public.teams;
CREATE POLICY "Teams: Admin Authority" ON public.teams
    FOR ALL TO authenticated
    USING (is_registry_admin());

-- 17. PUSH SUBSCRIBER SECURITY
ALTER TABLE public.push_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Push: Self Access" ON public.push_subscribers;
CREATE POLICY "Push: Self Access" ON public.push_subscribers
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 18. STORAGE BUCKET POLICIES
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-documents', 'project-documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Project Assets: Public Access" ON storage.objects;
CREATE POLICY "Project Assets: Public Access" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'project-documents');

DROP POLICY IF EXISTS "Project Assets: Authenticated Upload" ON storage.objects;
CREATE POLICY "Project Assets: Authenticated Upload" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-documents');

DROP POLICY IF EXISTS "Project Assets: Authenticated Delete" ON storage.objects;
CREATE POLICY "Project Assets: Authenticated Delete" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'project-documents');

-- 19. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- 20. SYNC EXISTING USERS (MANDATORY)
-- Ensures all auth users have a profile in the public.users table immediately
INSERT INTO public.users (id, name, email, role, "notificationPreferences", privileges)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
    email,
    COALESCE(raw_user_meta_data->>'role', 'Project Manager'),
    '{}'::jsonb,
    '{}'::text[]
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;
`;

const SqlInfoModal: React.FC<SqlInfoModalProps> = ({ isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // ESC key handler
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(SQL_CODE);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[120] flex justify-center items-center p-4 animate-fadeIn">
            <div className="bg-base-100 dark:bg-[#111111] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-4xl flex flex-col max-h-[90vh] border border-base-300 dark:border-white/10 overflow-hidden">
                {/* Header */}
                <div className="px-8 py-6 border-b border-base-200 dark:border-white/5 flex justify-between items-center bg-base-200/20 dark:bg-white/[0.02] shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-base-content dark:text-white uppercase tracking-tighter">Identity Registry SQL</h3>
                        <p className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] mt-1">Resolve Persistence & RLS Recursion</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-brand-tertiary transition-all rounded-full hover:bg-base-200 dark:hover:bg-white/5">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* SQL Code Block */}
                <div className="flex-1 overflow-auto bg-gray-950 font-mono text-xs relative custom-scrollbar">
                    <div className="sticky top-4 right-4 z-10 flex justify-end p-4 pointer-events-none">
                        <button 
                            onClick={handleCopy} 
                            className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold transition-all shadow-lg active:scale-95 ${copied ? 'bg-green-600' : 'bg-brand-primary hover:brightness-110'}`}
                        >
                            {copied ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    Copy Script
                                </>
                            )}
                        </button>
                    </div>
                    <pre className="px-8 pb-8 text-emerald-400 leading-relaxed whitespace-pre selection:bg-brand-primary/30">
                        {SQL_CODE}
                    </pre>
                </div>

                {/* Footer Info */}
                <div className="px-8 py-5 border-t border-base-200 dark:border-white/5 bg-base-200/30 dark:bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(211,162,0,0.5)]"></div>
                        <p className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-relaxed">
                            Run this script in the <span className="text-brand-primary">Supabase SQL Editor</span> to fix registry persistence and enable admin management.
                        </p>
                     </div>
                    <button onClick={onClose} className="px-8 py-2.5 rounded-xl bg-white dark:bg-white/5 text-gray-700 dark:text-white font-black uppercase text-[10px] tracking-[0.2em] border border-base-300 dark:border-white/10 hover:bg-base-100 transition-all shadow-sm">Close Registry</button>
                </div>
            </div>
        </div>
    );
};

export default SqlInfoModal;
