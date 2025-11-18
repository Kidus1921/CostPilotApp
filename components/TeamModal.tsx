import React, { useState, useEffect } from 'react';
import { Team, User } from '../types';

interface TeamModalProps {
    team: Team | null;
    allUsers: User[];
    onClose: () => void;
    onSave: (team: Omit<Team, 'id'>) => void;
}

const TeamModal: React.FC<TeamModalProps> = ({ team, allUsers, onClose, onSave }) => {
    const [name, setName] = useState(team?.name || '');
    const [description, setDescription] = useState(team?.description || '');
    const [memberIds, setMemberIds] = useState<string[]>(team?.memberIds || []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            alert('Team Name is required.');
            return;
        }
        onSave({ name, description, memberIds });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-base-100 rounded-lg shadow-xl p-8 w-full max-w-lg dark:bg-gray-800">
                <h3 className="text-xl font-bold mb-6 dark:text-white">{team ? 'Edit Team' : 'Add New Team'}</h3>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="team-name" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Team Name</label>
                        <input type="text" id="team-name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="team-description" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Description</label>
                        <textarea id="team-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="members" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Assign Members</label>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Hold Ctrl (or Cmd on Mac) to select multiple members.</p>
                        <select
                            id="members"
                            multiple
                            value={memberIds}
                            onChange={e => setMemberIds(Array.from(e.target.selectedOptions, option => (option as HTMLOptionElement).value))}
                            className="mt-1 block w-full h-40 px-3 py-2 border-base-300 focus:outline-none focus:ring-brand-primary rounded-md bg-base-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            {allUsers.map(user => (
                                <option key={user.id} value={user.id!} className="p-2 dark:text-white">{user.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-base-200 text-base-content font-bold py-2 px-4 rounded-lg hover:bg-base-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TeamModal;