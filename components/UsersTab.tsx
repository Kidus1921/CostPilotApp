
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase, PROJECT_URL, PUBLISHABLE_KEY } from '../supabaseClient';
import { User, UserRole, UserStatus, NotificationType, NotificationPriority } from '../types';
import { useAppContext } from '../AppContext';
import UserModal from './UserModal';
import { PlusIcon } from './IconComponents';
import { logActivity } from '../services/activityLogger';
import { createNotification } from '../services/notificationService';

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
    const map = { 
        [UserRole.Admin]: 'bg-brand-tertiary/10 text-brand-tertiary border border-brand-tertiary/20', 
        [UserRole.ProjectManager]: 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20', 
        [UserRole.Finance]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
    };
    return <span className={`px-2.5 py-0.5 inline-flex text-[10px] font-bold uppercase tracking-wider rounded-full border ${map[role]}`}>{role}</span>;
};

const UsersTab: React.FC = () => {
    const { users, teams, refreshData } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleSave = async (user: User) => {
        try {
            const safeData = { ...user, teamId: user.teamId || null }; 

            if (safeData.id) {
                const { id, password, ...rest } = safeData;
                const { error: profileError } = await supabase.from('users').update(rest).eq('id', id);
                if (profileError) throw profileError;
                if (password) alert("Password update for other users requires Admin API (Edge Function). Skipped.");
                logActivity('Updated User', user.name);
            } else {
                const tempClient = createClient(PROJECT_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
                const { data: authData, error: authError } = await tempClient.auth.signUp({ 
                    email: user.email, 
                    password: user.password || 'TempPass123!', 
                    options: { data: { name: user.name } } 
                });
                
                if (authError || !authData.user) throw new Error(authError?.message || "Auth creation failed");
                
                const { id, password, ...rest } = safeData;
                const newUser = { 
                    ...rest, 
                    id: authData.user.id, 
                    lastLogin: null, 
                    privileges: [], 
                    notificationPreferences: {} 
                };
                
                const { error: insertError } = await supabase.from('users').insert([newUser]);
                if (insertError) throw insertError;

                logActivity('Created User', user.name);
                await createNotification({ userId: newUser.id as string, title: 'Welcome', message: 'Account created.', type: NotificationType.System, priority: NotificationPriority.Medium });
            }
            setIsModalOpen(false);
            setEditingUser(null);
            refreshData();
        } catch (e: any) { alert(`Error: ${e.message}`); }
    };

    const handleDelete = async (u: User) => {
        if (!confirm(`Are you sure you want to delete ${u.name}?`)) return;
        try {
            const { error } = await supabase.from('users').delete().eq('id', u.id);
            if (error) throw error;
            logActivity('Deleted User', u.name);
            refreshData();
        } catch (e: any) { alert("Failed to delete user: " + e.message); }
    };

    return (
        <div>
            <div className="flex justify-end mb-6">
                <button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="bg-brand-primary text-white font-bold py-2.5 px-6 rounded-xl flex items-center shadow-lg hover:brightness-110 transition-all uppercase text-xs tracking-widest">
                    <PlusIcon className="w-5 h-5 mr-2"/> Add User
                </button>
            </div>
            <div className="bg-base-100 rounded-2xl shadow-sm overflow-x-auto dark:bg-gray-800 border border-base-300 dark:border-gray-700">
                <table className="min-w-full divide-y divide-base-200 dark:divide-gray-700">
                    <thead className="bg-base-200 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest dark:text-gray-400">Name</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest dark:text-gray-400">Role</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest dark:text-gray-400">Team</th>
                            <th className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-base-200 dark:divide-gray-700">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-base-200/30 dark:hover:bg-gray-700/30 transition-all">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-bold text-gray-900 dark:text-gray-100">{u.name}</div>
                                    <div className="text-xs text-gray-500">{u.email}</div>
                                </td>
                                <td className="px-6 py-4"><RoleBadge role={u.role}/></td>
                                <td className="px-6 py-4 text-xs font-medium text-gray-600 dark:text-gray-400">{teams.find(t => t.id === u.teamId)?.name || '-'}</td>
                                <td className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest">
                                    <button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="text-brand-primary hover:text-brand-dark mr-6 transition-colors">Edit</button>
                                    <button onClick={() => handleDelete(u)} className="text-brand-tertiary hover:text-red-700 transition-colors">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <UserModal user={editingUser} teams={teams} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

export default UsersTab;
