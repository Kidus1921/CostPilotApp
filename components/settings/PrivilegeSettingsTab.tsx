
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { User, UserRole } from '../../types';
import { SearchIcon, CheckCircleIcon, XCircleIcon, UserGroupIcon } from '../IconComponents';
import Avatar from '../Avatar';
import { logActivity } from '../../services/activityLogger';

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
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPrivilege, setSelectedPrivilege] = useState<PrivilegeDef | null>(null);

    useEffect(() => {
        const q = query(collection(db, "users"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersData: User[] = [];
            querySnapshot.forEach((doc) => {
                usersData.push({ id: doc.id, ...doc.data() } as User);
            });
            setUsers(usersData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching users for privileges:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const toggleUserPrivilege = async (user: User, privilegeId: string) => {
        if (!user.id) return;
        
        const currentPrivileges = user.privileges || [];
        let newPrivileges: string[];
        let action = '';

        if (currentPrivileges.includes(privilegeId)) {
            newPrivileges = currentPrivileges.filter(p => p !== privilegeId);
            action = 'Removed';
        } else {
            newPrivileges = [...currentPrivileges, privilegeId];
            action = 'Added';
        }

        try {
            const userRef = doc(db, "users", user.id);
            await updateDoc(userRef, {
                privileges: newPrivileges
            });
            logActivity('Updated Permissions', `${action} '${privilegeId}' for user ${user.name}`);
        } catch (err) {
            console.error("Failed to update privilege:", err);
            alert("Failed to update permissions.");
        }
    };

    const filteredPrivileges = useMemo(() => {
        return DEFINED_PRIVILEGES.filter(p => 
            p.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    const getUsersWithPrivilege = (privilegeId: string) => {
        return users.filter(u => u.role === UserRole.Admin || (u.privileges && u.privileges.includes(privilegeId)));
    };

    if (loading) return <div className="text-center p-10">Loading Permissions...</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Privilege Management</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Control which users can access specific functionalities. Admins have all privileges by default.
                    </p>
                </div>
                <div className="relative w-full md:w-64">
                    <SearchIcon className="absolute w-5 h-5 text-gray-400 top-1/2 left-3 transform -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search privileges..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-base-100 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filteredPrivileges.map(privilege => {
                    const authorizedUsers = getUsersWithPrivilege(privilege.id);
                    const isSelected = selectedPrivilege?.id === privilege.id;

                    return (
                        <div key={privilege.id} className={`bg-base-100 rounded-xl shadow-md border-l-4 transition-all duration-300 dark:bg-gray-800 ${isSelected ? 'border-brand-primary ring-2 ring-brand-primary ring-opacity-50' : 'border-gray-300 dark:border-gray-600'}`}>
                            <div className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            {privilege.label}
                                            <span className="px-2 py-0.5 text-xs font-normal bg-gray-100 text-gray-600 rounded-full dark:bg-gray-700 dark:text-gray-300">
                                                ID: {privilege.id}
                                            </span>
                                        </h4>
                                        <p className="text-gray-600 dark:text-gray-400 mt-1">{privilege.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedPrivilege(isSelected ? null : privilege)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isSelected ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white' : 'bg-brand-primary text-brand-primary-content hover:bg-teal-700'}`}
                                    >
                                        {isSelected ? 'Close Management' : 'Manage Access'}
                                    </button>
                                </div>

                                <div className="mt-4 flex items-center gap-2">
                                    <UserGroupIcon className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {authorizedUsers.length} {authorizedUsers.length === 1 ? 'user has' : 'users have'} this privilege
                                    </span>
                                    <div className="flex -space-x-2 ml-4">
                                        {authorizedUsers.slice(0, 5).map(u => (
                                            <Avatar key={u.id} name={u.name} size="sm" className="border-2 border-white dark:border-gray-800" />
                                        ))}
                                        {authorizedUsers.length > 5 && (
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold border-2 border-white dark:border-gray-800 dark:bg-gray-600 dark:text-white">
                                                +{authorizedUsers.length - 5}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded User Management Area */}
                            {isSelected && (
                                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 p-6 animate-fadeIn">
                                    <h5 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Assign to Users</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {users.map(user => {
                                            const isAdmin = user.role === UserRole.Admin;
                                            const hasAccess = isAdmin || (user.privileges && user.privileges.includes(privilege.id));
                                            
                                            return (
                                                <div key={user.id} className={`flex items-center justify-between p-3 rounded-lg border ${hasAccess ? 'bg-white border-green-200 dark:bg-gray-800 dark:border-green-900' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={user.name} size="sm" />
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    {isAdmin ? (
                                                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded dark:bg-gray-700">Admin (Always On)</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => toggleUserPrivilege(user, privilege.id)}
                                                            className={`p-2 rounded-full transition-colors ${hasAccess ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                            title={hasAccess ? "Revoke Access" : "Grant Access"}
                                                        >
                                                            {hasAccess ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />}
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
                
                {filteredPrivileges.length === 0 && (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                        No privileges found matching "{searchTerm}".
                    </div>
                )}
            </div>
        </div>
    );
};

export default PrivilegeSettingsTab;