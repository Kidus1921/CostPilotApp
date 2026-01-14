
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { User } from '../../types';
import Avatar from '../Avatar';

interface ProfileSettingsTabProps {
    currentUser: User;
    onUserUpdate: (updatedUser: User) => void;
}

const ProfileSettingsTab: React.FC<ProfileSettingsTabProps> = ({ currentUser, onUserUpdate }) => {
    const [name, setName] = useState(currentUser.name);
    const [phone, setPhone] = useState(currentUser.phone);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        setName(currentUser.name);
        setPhone(currentUser.phone);
    }, [currentUser]);
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('saving');
        try {
            const updatedData = { name, phone };
            const { error } = await supabase.from('users').update(updatedData).eq('id', currentUser.id);
            if (error) throw error;
            onUserUpdate({ ...currentUser, ...updatedData });
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (err) {
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    // Shared negative input styling
    const inputClasses = "w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none text-white font-medium placeholder-gray-500 transition-all shadow-inner";

    return (
        <div className="max-w-3xl mx-auto bg-base-100 dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-base-300 dark:border-gray-700">
            <h3 className="text-xl font-bold text-base-content dark:text-white mb-8 uppercase tracking-widest">My Digital Profile</h3>
            
            <div className="flex flex-col sm:flex-row items-center gap-8 mb-10">
                <Avatar name={name} size="lg" className="w-24 h-24 text-3xl ring-4 ring-brand-primary/10" />
                <div className="text-center sm:text-left">
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{currentUser.email}</p>
                    <span className="inline-block mt-3 px-4 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-bold uppercase tracking-widest rounded-full border border-brand-primary/20">
                        {currentUser.role}
                    </span>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label htmlFor="name" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Name</label>
                        <input 
                            type="text" 
                            id="name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            className={inputClasses}
                            required 
                        />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Contact</label>
                        <input 
                            type="tel" 
                            id="phone" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                            className={inputClasses}
                            placeholder="+251..." 
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-base-200 dark:border-gray-700 mt-4">
                     <span className={`text-xs font-bold uppercase tracking-widest transition-opacity duration-300 ${status === 'saved' ? 'text-green-600' : status === 'error' ? 'text-brand-tertiary' : 'opacity-0'}`}>
                        {status === 'saved' ? 'SYNC SUCCESSFUL' : 'SYNC FAILURE'}
                    </span>
                    <button type="submit" disabled={status === 'saving'} className="bg-brand-primary text-white font-bold py-3 px-10 rounded-xl shadow-lg hover:brightness-110 disabled:opacity-50 transition-all uppercase text-xs tracking-widest">
                        {status === 'saving' ? 'Processing...' : 'Save Profile'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProfileSettingsTab;
