
import React, { useState } from 'react';

interface SqlInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SQL_CODE = `-- --- FMS SYSTEM INITIALIZATION ---
-- PROJECT: CostPilot / EDFM
-- PURPOSE: Unified User Sync and Notification Engine

-- 1. NOTIFICATIONS TABLE
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
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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

  INSERT INTO public.notifications ("userId", title, message, type, priority, "isRead", timestamp)
  VALUES (
    new.id,
    'Welcome to FMS',
    'Your financial account has been initialized and synchronized.',
    'System',
    'Low',
    false,
    NOW()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER REGISTRATION
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. AUTOMATION & EDGE FUNCTIONS
-- Run these in terminal to enable advanced email features:

-- A) Configuration:
-- supabase secrets set RESEND_API_KEY=re_your_key
-- supabase secrets set RESEND_FROM_EMAIL=onboarding@resend.dev

-- B) Deployment:
-- supabase functions deploy send-test-email
-- supabase functions deploy send-email
-- supabase functions deploy due-project-email

-- C) Cron Schedule (Dashboard > Database > Edge HTTP):
-- Create a Cron Trigger for 'due-project-email'
-- Schedule: 0 9 * * * (Every morning at 9:00 AM)
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[120] flex justify-center items-center p-4 animate-fadeIn">
            <div className="bg-base-100 dark:bg-[#111111] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-4xl flex flex-col max-h-[85vh] border border-base-300 dark:border-white/10 overflow-hidden">
                {/* Header */}
                <div className="px-8 py-6 border-b border-base-200 dark:border-white/5 flex justify-between items-center bg-base-200/20 dark:bg-white/[0.02]">
                    <div>
                        <h3 className="text-xl font-black text-base-content dark:text-white uppercase tracking-tighter">System Blueprint</h3>
                        <p className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] mt-1">Operational SQL & Automation Registry</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-brand-tertiary transition-all rounded-full hover:bg-base-200 dark:hover:bg-white/5">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* SQL Code Block */}
                <div className="p-6 overflow-auto flex-1 bg-gray-950 font-mono text-xs relative custom-scrollbar">
                    <div className="absolute top-4 right-4 z-10">
                        <button 
                            onClick={handleCopy} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold transition-all shadow-lg active:scale-95 ${copied ? 'bg-green-600' : 'bg-brand-primary hover:brightness-110'}`}
                        >
                            {copied ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    Copy Initialization
                                </>
                            )}
                        </button>
                    </div>
                    <pre className="p-4 text-emerald-400 leading-relaxed whitespace-pre selection:bg-brand-primary/30">
                        {SQL_CODE}
                    </pre>
                </div>

                {/* Footer Info */}
                <div className="px-8 py-5 border-t border-base-200 dark:border-white/5 bg-base-200/30 dark:bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-4">
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(211,162,0,0.5)]"></div>
                        <p className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-relaxed">
                            Includes instructions for <span className="text-brand-primary">Resend Email Relay</span> and <span className="text-brand-primary">Automated Deadlines</span>.
                        </p>
                     </div>
                    <button onClick={onClose} className="px-8 py-2.5 rounded-xl bg-white dark:bg-white/5 text-gray-700 dark:text-white font-black uppercase text-[10px] tracking-[0.2em] border border-base-300 dark:border-white/10 hover:bg-base-100 transition-all shadow-sm">Close Registry</button>
                </div>
            </div>
        </div>
    );
};

export default SqlInfoModal;
