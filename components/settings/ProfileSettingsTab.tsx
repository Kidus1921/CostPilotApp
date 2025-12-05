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
            const { error } = await supabase
                .from('users')
                .update(updatedData)
                .eq('id', currentUser.id);

            if (error) throw error;
            
            // Optimistic update for parent component
            onUserUpdate({ ...currentUser, ...updatedData });
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (err) {
            console.error("Error updating profile:", err);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <div className="max-w-3xl mx-auto bg-base-100 dark:bg-gray-800 p-8 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">My Profile</h3>
            
            <div className="flex flex-col sm:flex-row items-center gap-8 mb-8">
                <Avatar name={name} size="lg" className="w-24 h-24 text-3xl" />
                <div className="text-center sm:text-left">
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{name}</h4>
                    <p className="text-gray-500 dark:text-gray-400">{currentUser.email}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-brand-secondary/10 text-brand-secondary text-sm font-medium rounded-full">
                        {currentUser.role}
                    </span>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={currentUser.email}
                            disabled
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:border-gray-500 dark:text-gray-400"
                        />
                        <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Email cannot be changed. Contact admin for assistance.</p>
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                        <input
                            type="tel"
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                     <span className={`text-sm font-medium transition-opacity duration-300 ${status === 'saved' ? 'text-green-600 opacity-100' : status === 'error' ? 'text-red-600 opacity-100' : 'opacity-0'}`}>
                        {status === 'saved' ? 'Changes saved successfully.' : 'Failed to save changes.'}
                    </span>
                    <button
                        type="submit"
                        disabled={status === 'saving'}
                        className="bg-brand-primary text-brand-primary-content font-bold py-2 px-6 rounded-lg shadow-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {status === 'saving' ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProfileSettingsTab;