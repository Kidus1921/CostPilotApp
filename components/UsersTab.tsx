
import React, { useState } from 'react';
import { supabase, PROJECT_URL } from '../supabaseClient';
import { User, UserRole, NotificationType, NotificationPriority } from '../types';
import { useAppContext } from '../AppContext';
import UserModal from './UserModal';
import { PlusIcon, PencilIcon, TrashIcon, UserGroupIcon } from './IconComponents';
import { logActivity } from '../services/activityLogger';
import { createNotification } from '../services/notificationService';

const CREATE_USER_API_URL = '/api/users/create';
const SYNC_USERS_API_URL = '/api/users/sync';

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  const map = {
    [UserRole.Admin]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200',
    [UserRole.ProjectManager]: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
    [UserRole.Finance]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200',
  };

  return (
    <span className={`px-2.5 py-1 inline-flex text-[10px] font-bold uppercase tracking-wider rounded-full border ${map[role]}`}>
      {role}
    </span>
  );
};

const UsersTab: React.FC = () => {
  const { users, teams, refreshData } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(SYNC_USERS_API_URL, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      alert(`Sync Complete: ${data.syncedCount} users added to registry.`);
      refreshData();
    } catch (e: any) {
      alert('Sync Error: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async (user: User, password?: string) => {
    try {
      if (user.id) {
        // Update existing via direct DB call (RLS allowing)
        // Fix: Removed 'password' from destructuring as it does not exist on the User type. 
        // We also cast to any to ensure we can flexibly exclude specific fields from the update payload.
        const { id, email: __, ...updatePayload } = user as any;
        console.log(`Registry: Syncing update for ${user.name} (ID: ${id}). New Role: ${user.role}`);
        const { error } = await supabase.from('users').update(updatePayload).eq('id', id);
        if (error) throw error;
        logActivity('Registry Sync', `Updated credentials for ${user.name}`);
      } else {
        // Deploy new via Server API
        const res = await fetch(CREATE_USER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            password: password || 'TempAuth_123!',
            name: user.name,
            role: user.role,
            teamId: user.teamId || null,
            phone: user.phone || null
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Registry rejection.');

        logActivity('Agent Deployment', user.name);
      }

      setIsModalOpen(false);
      setEditingUser(null);
      refreshData();
    } catch (e: any) {
      console.error('Unified Registry Write Fault:', e);
      alert(`Fault: ${e.message || 'The system identity registry rejected the sync request.'}`);
    }
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`Purge agent "${u.name}"? Action is permanent.`)) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', u.id);
      if (error) throw error;
      logActivity('Registry Purge', u.name);
      refreshData();
    } catch (e: any) {
      alert('Purge Failure: ' + e.message);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tighter">Identity Registry</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Operational Authority Roster</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 font-bold py-3 px-6 rounded-xl flex items-center shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50 transition-all text-[10px] uppercase tracking-widest"
          >
            {isSyncing ? 'Syncing...' : 'Sync Auth Users'}
          </button>
          <button
            onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
            className="bg-brand-primary text-white font-bold py-3 px-8 rounded-xl flex items-center shadow-lg hover:brightness-110 active:scale-95 transition-all text-[10px] uppercase tracking-widest"
          >
            <PlusIcon className="w-4 h-4 mr-2" /> Deploy Agent
          </button>
        </div>
      </div>

      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-300 dark:bg-[#111111] dark:border-white/10 overflow-hidden">
        <table className="min-w-full divide-y divide-base-200 dark:divide-white/5">
          <thead className="bg-base-200/50 dark:bg-gray-800/50">
            <tr>
              <th className="px-6 py-5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest dark:text-gray-400">Agent Identifier</th>
              <th className="px-6 py-5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest dark:text-gray-400">Authority Role</th>
              <th className="px-6 py-5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest dark:text-gray-400">Functional Unit</th>
              <th className="px-6 py-5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest dark:text-gray-400">Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-200 dark:divide-white/5">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-base-200/30 dark:hover:bg-white/[0.02] transition-all group">
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center font-bold text-brand-primary uppercase">
                        {u.name.charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">{u.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 align-middle"><RoleBadge role={u.role} /></td>
                <td className="px-6 py-5 align-middle">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        <UserGroupIcon className="w-4 h-4 opacity-30" />
                        {teams.find((t) => t.id === u.teamId)?.name || <span className="opacity-30 italic font-normal">Independent</span>}
                    </div>
                </td>
                <td className="px-6 py-5 text-right align-middle">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(u)} className="p-2 text-gray-400 hover:text-brand-tertiary hover:bg-brand-tertiary/10 rounded-lg transition-all">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <UserModal
          user={editingUser}
          teams={teams}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default UsersTab;
