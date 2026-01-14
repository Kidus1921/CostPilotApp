
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { User, UserRole } from '../../types';
import { SearchIcon, CheckCircleIcon, XCircleIcon, UserGroupIcon } from '../IconComponents';
import Avatar from '../Avatar';
import { logActivity } from '../../services/activityLogger';
import { useAppContext } from '../../AppContext';

interface PrivilegeDef {
    id: string;
    label: string;
    description: string;
}

const DEFINED_PRIVILEGES: PrivilegeDef[] = [
    { id: 'can_create_project', label: 'Create Project', description: 'Allows the user to create new projects.' },
    { id: 'can_edit_project', label: 'Edit Project', description: 'Allows editing existing project details.' },
    { id: 'can_delete_project', label: 'Delete Project', description: 'Grants permission to permanently delete projects.' },
    { id: 'can_manage_tasks', label: 'Manage Tasks', description: 'Allows adding and deleting tasks within a project.' },
    { id: 'can_manage_documents', label: 'Manage Documents', description: 'Allows uploading and deleting project documents.' },
    { id: 'can_export_reports', label: 'Export Reports', description: 'Allows exporting data to Excel or PDF format.' },
];

const PrivilegeSettingsTab: React.FC = () => {
    const { currentUser } = useAppContext();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPrivilege, setSelectedPrivilege] = useState<PrivilegeDef | null>(null);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase.from('users').select('*').order('name');
            if (error) throw error;
            setUsers(data as User[]);
        } catch (err) {
            console.error("Error fetching users for privileges:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        const channel = supabase.channel('privilege_settings').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const toggleUserPrivilege = async (targetUser: User, privilegeId: string) => {
        if (!targetUser.id) return;
        const currentPrivileges = targetUser.privileges || [];
        const newPrivileges = currentPrivileges.includes(privilegeId) ? currentPrivileges.filter(p => p !== privilegeId) : [...currentPrivileges, privilegeId];
        try {
            const { error } = await supabase.from('users').update({ privileges: newPrivileges }).eq('id', targetUser.id);
            if (error) throw error;
            logActivity('Updated Permissions', `${currentPrivileges.includes(privilegeId) ? 'Removed' : 'Added'} '${privilegeId}' for user ${targetUser.name}`, currentUser);
            setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, privileges: newPrivileges } : u));
        } catch (err) { alert("Failed to update permissions."); }
    };

    const filteredPrivileges = useMemo(() => DEFINED_PRIVILEGES.filter(p => p.label.toLowerCase().includes(searchTerm.toLowerCase())), [searchTerm]);

    if (loading) return <div className="p-20 text-center animate-pulse uppercase tracking-[0.3em] font-bold text-gray-500">Syncing Matrix...</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-2xl font-bold dark:text-white uppercase tracking-widest">Authority Control</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-bold uppercase tracking-wider">Granular System Permission Management</p>
                </div>
                <div className="relative w-full md:w-64">
                    <SearchIcon className="absolute w-4 h-4 text-gray-400 top-1/2 left-3 transform -translate-y-1/2" />
                    <input type="text" placeholder="Search scope..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-base-300 rounded-xl bg-base-100 focus:ring-2 focus:ring-brand-primary outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white text-xs font-bold uppercase tracking-wider" />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredPrivileges.map(privilege => {
                    const authorizedUsers = users.filter(u => u.role === UserRole.Admin || (u.privileges && u.privileges.includes(privilege.id)));
                    const isSelected = selectedPrivilege?.id === privilege.id;

                    return (
                        <div key={privilege.id} className={`bg-base-100 rounded-2xl shadow-sm border-l-[6px] transition-all duration-300 dark:bg-gray-800 ${isSelected ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-base-300 dark:border-gray-700'}`}>
                            <div className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                                            {privilege.label}
                                        </h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{privilege.description}</p>
                                    </div>
                                    <button onClick={() => setSelectedPrivilege(isSelected ? null : privilege)} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isSelected ? 'bg-base-200 text-gray-800 dark:bg-gray-700 dark:text-white border border-base-300 dark:border-gray-600' : 'bg-brand-primary text-white shadow-lg hover:brightness-110'}`}>
                                        {isSelected ? 'Lock Access' : 'Manage Access'}
                                    </button>
                                </div>
                            </div>

                            {isSelected && (
                                <div className="border-t border-base-200 dark:border-gray-700 bg-base-200/20 dark:bg-gray-700/30 p-6 animate-fadeIn">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {users.map(user => {
                                            const isAdmin = user.role === UserRole.Admin;
                                            const hasAccess = isAdmin || (user.privileges && user.privileges.includes(privilege.id));
                                            return (
                                                <div key={user.id} className={`flex items-center justify-between p-3 rounded-xl border ${hasAccess ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-900/50' : 'bg-white dark:bg-gray-800 border-base-300 dark:border-gray-700'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={user.name} size="sm" />
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{user.name}</p>
                                                            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{user.role}</p>
                                                        </div>
                                                    </div>
                                                    {isAdmin ? <span className="text-[9px] font-bold text-gray-400 bg-base-100 px-2 py-1 rounded-lg border border-base-200 uppercase">Super</span> : (
                                                        <button onClick={() => toggleUserPrivilege(user, privilege.id)} className={`p-2 rounded-full transition-all ${hasAccess ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-300 hover:text-brand-primary hover:bg-brand-primary/5'}`}>
                                                            {hasAccess ? <CheckCircleIcon className="w-5 h-5" /> : <XCircleIcon className="w-5 h-5" />}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PrivilegeSettingsTab;
