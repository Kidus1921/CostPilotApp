
import React, { useState } from 'react';

interface SqlInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SQL_CODE = `-- --- COSTPILOT: USER REGISTRY RECURSION FIX ---
-- PURPOSE: Atomic Profile Sync & Secure Authority Matrix

-- 1. SECURITY DEFINER GATEKEEPER
-- Prevents RLS infinite loops by querying table as table owner.
CREATE OR REPLACE FUNCTION public.is_registry_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. RESET & APPLY POLICIES
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
    USING (is_registry_admin())
    WITH CHECK (is_registry_admin());

-- 3. IDENTITY SYNC TRIGGER
CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, status, active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'New Agent'),
    new.email,
    'Project Manager', 
    'Active',
    true
  ) ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.sync_user_profile();
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
                        <h3 className="text-xl font-black text-base-content dark:text-white uppercase tracking-tighter">Identity Registry SQL</h3>
                        <p className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] mt-1">Resolve Persistence & RLS Recursion</p>
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
                                    Copy Script
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
