import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
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
            const userRef = doc(db, 'users', currentUser.id!);
            const updatedData = { name, phone };
            await updateDoc(userRef, updatedData);

            const updatedUser = { ...currentUser, ...updatedData };
            onUserUpdate(updatedUser);

            setStatus('saved');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (error) {
            console.error("Failed to update profile:", error);
            setStatus('error');
        }
    };
    
    const isChanged = currentUser.name !== name || currentUser.phone !== phone;

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="bg-base-100 dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-md">
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                    <Avatar name={currentUser.name} size="lg" />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{currentUser.name}</h2>
                        <p className="text-base-content-secondary dark:text-gray-400">{currentUser.email}</p>
                        <p className="text-sm text-base-content-secondary dark:text-gray-500">{currentUser.role}</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full px-4 py-2 bg-base-200 dark:bg-gray-700 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary dark:text-white"
                        />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Phone Number</label>
                        <input
                            type="tel"
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="mt-1 block w-full px-4 py-2 bg-base-200 dark:bg-gray-700 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary dark:text-white"
                        />
                    </div>
                     <div>
                        <label htmlFor="email" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={currentUser.email}
                            disabled
                            className="mt-1 block w-full px-4 py-2 bg-base-200 dark:bg-gray-700/50 border border-transparent rounded-md text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        />
                         <p className="text-xs text-gray-500 mt-1 dark:text-gray-500">Email address cannot be changed.</p>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={!isChanged || status === 'saving'}
                            className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileSettingsTab;