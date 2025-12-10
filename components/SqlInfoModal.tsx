
import React, { useState } from 'react';

interface SqlInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SQL_CODE = `-- 1. Create push_subscribers table
DROP TABLE IF EXISTS public.push_subscribers;
CREATE TABLE public.push_subscribers (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscriber_id TEXT NOT NULL,
    platform TEXT DEFAULT 'sendpulse',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, subscriber_id)
);
ALTER TABLE public.push_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own" ON public.push_subscribers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own" ON public.push_subscribers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own" ON public.push_subscribers FOR DELETE USING (auth.uid() = user_id);

-- 2. Create notifications table
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-base-100 dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-base-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-base-content dark:text-white">Database Setup SQL</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-bold text-xl">
                        &times;
                    </button>
                </div>
                <div className="p-0 overflow-auto flex-1 bg-gray-900 text-gray-300 font-mono text-sm relative">
                    <pre className="p-4">{SQL_CODE}</pre>
                </div>
                <div className="p-4 border-t border-base-200 dark:border-gray-700 flex justify-end gap-2 bg-base-100 dark:bg-gray-800 rounded-b-xl">
                     <button onClick={handleCopy} className={`px-4 py-2 rounded-lg text-white font-bold transition-colors ${copied ? 'bg-green-600' : 'bg-brand-primary hover:bg-teal-700'}`}>
                        {copied ? 'Copied!' : 'Copy SQL'}
                     </button>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-base-200 hover:bg-base-300 text-base-content font-bold dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white">Close</button>
                </div>
            </div>
        </div>
    );
};

export default SqlInfoModal;
