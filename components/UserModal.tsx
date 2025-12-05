
import React, { useState, useEffect } from 'react';
import { User, UserRole, UserStatus, Team } from '../types';

interface UserModalProps {
    user: User | null;
    teams: Team[];
    onClose: () => void;
    onSave: (user: User) => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, teams, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<User>>({
        name: '',
        email: '',
        phone: '',
        role: UserRole.ProjectManager,
        status: UserStatus.Active,
        teamId: null,
    });
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Sync state with props when modal opens or user changes
    useEffect(() => {
        if (user) {
            setFormData({
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
                status: user.status,
                teamId: user.teamId || null,
            });
        } else {
            // Reset for Add Mode
            setFormData({
                name: '',
                email: '',
                phone: '',
                role: UserRole.ProjectManager,
                status: UserStatus.Active,
                teamId: null,
            });
            setPassword('');
            setConfirmPassword('');
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        // Postgres UUID column expects null, not empty string
        setFormData(prev => ({ ...prev, teamId: val === "" ? null : val }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Trim inputs to avoid auth errors with leading/trailing spaces
        const cleanName = formData.name?.trim() || '';
        const cleanEmail = formData.email?.trim() || '';

        if (!cleanName || !cleanEmail) {
            alert('Please fill in name and email.');
            return;
        }
        if (password && password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        const dataToSave: User = {
            ...formData as User,
            name: cleanName,
            email: cleanEmail,
            phone: formData.phone || '',
            role: formData.role || UserRole.ProjectManager,
            status: formData.status || UserStatus.Active,
            teamId: formData.teamId || null 
        };

        if (password) {
            dataToSave.password = password;
        }

        onSave(dataToSave);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto dark:bg-gray-800">
                <h3 className="text-lg font-bold mb-4 dark:text-white">{user ? 'Edit User' : 'Add New User'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Full Name</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Email</label>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                     <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Phone</label>
                        <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                     <div>
                        <label htmlFor="password" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Password</label>
                        <input type="password" id="password" name="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={user ? 'Leave blank to keep current' : ''} className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                     <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Confirm Password</label>
                        <input type="password" id="confirmPassword" name="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Role</label>
                            <select id="role" name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 border-base-300 focus:outline-none focus:ring-brand-primary rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Status</label>
                            <select id="status" name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 border-base-300 focus:outline-none focus:ring-brand-primary rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                {Object.values(UserStatus).map(status => <option key={status} value={status}>{status}</option>)}
                            </select>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="teamId" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Team</label>
                        <select id="teamId" name="teamId" value={formData.teamId || ""} onChange={handleTeamChange} className="mt-1 block w-full pl-3 pr-10 py-2 border-base-300 focus:outline-none focus:ring-brand-primary rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="">No Team</option>
                            {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-base-200 text-base-content font-bold py-2 px-4 rounded-lg hover:bg-base-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" className="bg-brand-primary text-brand-primary-content font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserModal;
