
import React, { useState } from 'react';

interface SqlInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SQL_CODE = `-- --- FMS SYSTEM INITIALIZATION ---

-- 1. Create notifications table
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

-- 2. CREATE USER SYNC TRIGGER
-- This function runs whenever a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Sync to public profile table (public.users)
  -- We use ON CONFLICT to prevent errors if the user already exists
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

  -- 2. Create welcome notification
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

-- Cleanup existing trigger to prevent "already exists" errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on the auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. EDGE FUNCTION DEPLOYMENT
-- Command to deploy the test email function:
-- supabase functions deploy send-test-email

-- 4. WEBHOOKS & AUTOMATION
-- To enable true 'noreply' background emails:
-- Go to Supabase > Database > Webhooks
-- Event: INSERT on public.notifications
-- URL: /functions/v1/send-email
`;

const SqlInfoModal: React.FC<SqlInfoModalProps> = ({ isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(SQL_CODE);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[120] flex justify-center items-center p-4">
            <div className="bg-base-100 dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-base-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-base-content dark:text-white uppercase tracking-tighter">FMS System Control</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-bold text-xl">
                        &times;
                    </button>
                </div>
                <div className="p-4 overflow-auto flex-1 bg-gray-900 text-gray-300 font-mono text-xs relative">
                    <div className="mb-4 p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-lg text-brand-primary">
                        <strong>Operational Requirement:</strong> Run this SQL in your Supabase SQL Editor. It includes a cleanup command to overwrite existing triggers if necessary.
                    </div>
                    <pre className="p-4 whitespace-pre-wrap">{SQL_CODE}</pre>
                </div>
                <div className="p-4 border-t border-base-200 dark:border-gray-700 flex justify-end gap-2 bg-base-100 dark:bg-gray-800 rounded-b-xl">
                     <button onClick={handleCopy} className={`px-4 py-2 rounded-lg text-white font-bold transition-colors ${copied ? 'bg-green-600' : 'bg-brand-primary hover:bg-teal-700'}`}>
                        {copied ? 'Copied!' : 'Copy Initialization SQL'}
                     </button>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-base-200 hover:bg-base-300 text-base-content font-bold dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white uppercase text-[10px] tracking-widest">Close</button>
                </div>
            </div>
        </div>
    );
};

export default SqlInfoModal;
