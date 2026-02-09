
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
    return <span className={`px-3 py-1 inline-flex text-[10px] font-black uppercase tracking-widest rounded-full border ${map[role]}`}>{role}</span>;
};

const UsersTab: React.FC = () => {
    const { users, teams, refreshData } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleSave = async (user: User, password?: string) => {
        try {
            const safeData = { ...user, teamId: user.teamId || null }; 

            if (safeData.id) {
                // UPDATE PROTOCOL
                const { id, password: _, email: __, ...updatePayload } = safeData;
                const { error: profileError } = await supabase
                    .from('users')
                    .update(updatePayload)
                    .eq('id', id);
                
                if (profileError) throw profileError;
                logActivity('User Registry Sync', user.name);
            } else {
                // ENROLLMENT PROTOCOL
                // Initialize Auth with role in metadata to support JWT RLS
                const tempClient = createClient(PROJECT_URL, PUBLISHABLE_KEY, { 
                    auth: { persistSession: false, autoRefreshToken: false } 
                });
                
                const { data: authData, error: authError } = await (tempClient.auth as any).signUp({ 
                    email: user.email, 
                    password: password || 'TempPass_123_@CostPilot', 
                    options: { 
                        data: { 
                            name: user.name,
                            role: user.role // CRITICAL: This enables the JWT-based RLS check
                        } 
                    } 
                });
                
                if (authError || !authData.user) {
                    throw new Error(authError?.message || "Authentication Gateway Rejection");
                }
                
                // Commit Profile Data (excluding password)
                const { id: _, password: __, ...profileData } = safeData;
                
                const { error: upsertError } = await supabase
                    .from('users')
                    .upsert({
                        ...profileData,
                        id: authData.user.id,
                        email: authData.user.email
                    }, { onConflict: 'id' });
                
                if (upsertError) {
                    throw new Error(`Registry Write Error: ${upsertError.message}`);
                }

                logActivity('Registry Enrollment', user.name);
                await createNotification({ 
                    userId: authData.user.id, 
                    title: 'Security Clearance Granted', 
                    message: 'Personnel file initialized. Registry entry successfully committed.', 
                    type: NotificationType.System, 
                    priority: NotificationPriority.Medium 
                });
            }
            setIsModalOpen(false);
            setEditingUser(null);
            refreshData();
        } catch (e: any) { 
            console.error("Registry Persistence Failure:", e);
            alert(`Registry Fault: ${e.message || 'Database rejected the synchronization request.'}`); 
        }
    };

    const handleDelete = async (u: User) => {
        if (!confirm(`CRITICAL: Purge agent ${u.name} from operational registry? This action is permanent.`)) return;
        try {
            const { error } = await supabase.from('users').delete().eq('id', u.id);
            if (error) throw error;
            logActivity('Agent Decommissioned', u.name);
            refreshData();
        } catch (e: any) { alert("Decommissioning Protocol Failure: " + e.message); }
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-end mb-10">
                <button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="bg-brand-primary text-white font-black py-4 px-12 rounded-[2rem] flex items-center shadow-[0_20px_40px_-10px_rgba(211,162,0,0.3)] hover:brightness-110 active:scale-95 transition-all uppercase text-[10px] tracking-[0.3em]">
                    <PlusIcon className="w-5 h-5 mr-3"/> Enroll New Agent
                </button>
            </div>
            
            <div className="bg-base-100 rounded-[2.5rem] shadow-2xl overflow-hidden dark:bg-[#111111] border border-base-300 dark:border-white/10">
                <table className="min-w-full divide-y divide-base-200 dark:divide-gray-700">
                    <thead className="bg-base-200/50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-10 py-7 text-left text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] dark:text-gray-400">Agent Identity</th>
                            <th className="px-10 py-7 text-left text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] dark:text-gray-400">Access Tier</th>
                            <th className="px-10 py-7 text-left text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] dark:text-gray-400">Unit Assignment</th>
                            <th className="relative px-10 py-7"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-base-200 dark:divide-white/5">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-base-200/30 dark:hover:bg-white/[0.02] transition-all group">
                                <td className="px-10 py-6 whitespace-nowrap">
                                    <div className="font-black text-gray-900 dark:text-gray-100 group-hover:text-brand-primary transition-colors text-base tracking-tighter uppercase">{u.name}</div>
                                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{u.email}</div>
                                </td>
                                <td className="px-10 py-6"><RoleBadge role={u.role}/></td>
                                <td className="px-10 py-6 text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">
                                    {teams.find(t => t.id === u.teamId)?.name || <span className="opacity-20 italic">Independent</span>}
                                </td>
                                <td className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.3em]">
                                    <div className="flex justify-end gap-8">
                                        <button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="text-gray-400 hover:text-brand-primary transition-all">Modify</button>
                                        <button onClick={() => handleDelete(u)} className="text-gray-400 hover:text-brand-tertiary transition-all">Purge</button>
                                    </div>
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
