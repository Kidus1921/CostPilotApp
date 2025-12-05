
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
    const map = { [UserRole.Admin]: 'bg-red-100 text-red-800', [UserRole.ProjectManager]: 'bg-yellow-100 text-yellow-800', [UserRole.Finance]: 'bg-indigo-100 text-indigo-800' };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${map[role]}`}>{role}</span>;
};

const UsersTab: React.FC = () => {
    const { users, teams, refreshData } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleSave = async (user: User) => {
        try {
            const safeData = { ...user, teamId: user.teamId || null }; 

            if (safeData.id) {
                // Update User
                const { id, password, ...rest } = safeData;
                
                // 1. Update Public Profile
                const { error: profileError } = await supabase.from('users').update(rest).eq('id', id);
                if (profileError) throw profileError;

                // 2. (Optional) If password provided, update Auth (requires user to be logged in or admin API, which is restricted in client)
                // Note: Updating another user's password via client-side SDK is restricted for security. 
                // In a real app, use a Supabase Edge Function with Service Role.
                if (password) {
                    alert("Password update for other users requires Admin API (Edge Function). Skipped.");
                }

                logActivity('Updated User', user.name);
            } else {
                // Create User
                // Use a temporary client to avoid logging out the current admin user when using signUp
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
            // Delete from public profile. Auth user will remain but be orphaned (effectively disabled from app logic)
            // To delete from Auth, requires Service Role Key in Edge Function.
            const { error } = await supabase.from('users').delete().eq('id', u.id);
            if (error) throw error;
            
            logActivity('Deleted User', u.name);
            refreshData();
        } catch (e: any) {
            alert("Failed to delete user: " + e.message);
        }
    };

    const handleEditClick = (u: User) => {
        setEditingUser(u);
        setIsModalOpen(true);
    };

    const handleAddClick = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={handleAddClick} className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg flex items-center shadow hover:bg-teal-700 transition-colors"><PlusIcon className="w-5 h-5 mr-2"/> Add User</button>
            </div>
            <div className="bg-base-100 rounded-xl shadow-md overflow-x-auto dark:bg-gray-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider dark:text-gray-400">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider dark:text-gray-400">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider dark:text-gray-400">Team</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map(u => (
                            <tr key={u.id}>
                                <td className="px-6 py-4 whitespace-nowrap dark:text-gray-200">
                                    <div className="font-medium">{u.name}</div>
                                    <div className="text-sm text-gray-500">{u.email}</div>
                                </td>
                                <td className="px-6 py-4"><RoleBadge role={u.role}/></td>
                                <td className="px-6 py-4 dark:text-gray-300">{teams.find(t => t.id === u.teamId)?.name || '-'}</td>
                                <td className="px-6 py-4 text-right text-sm font-medium">
                                    <button onClick={() => handleEditClick(u)} className="text-brand-primary hover:text-teal-900 dark:hover:text-teal-400 mr-4 font-bold">Edit</button>
                                    <button onClick={() => handleDelete(u)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400 font-bold">Delete</button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-8 text-gray-500">No users found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <UserModal user={editingUser} teams={teams} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

export default UsersTab;
