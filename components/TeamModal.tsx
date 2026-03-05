
import React, { useState, useEffect } from 'react';
import { Team, User } from '../types';

interface TeamModalProps {
    team: Team | null;
    allUsers: User[];
    onClose: () => void;
    onSave: (team: Omit<Team, 'id'>) => void;
}

const TeamModal: React.FC<TeamModalProps> = ({ team, allUsers, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [memberIds, setMemberIds] = useState<string[]>([]);

    // Body scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // ESC key handler
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        if (team) {
            setName(team.name);
            setDescription(team.description || '');
            setMemberIds(team.memberIds || []);
        } else {
            setName('');
            setDescription('');
            setMemberIds([]);
        }
    }, [team]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            alert('Team Name is required.');
            return;
        }
        onSave({ name, description, memberIds });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex justify-center items-center p-4">
            <div className="bg-base-100 dark:bg-[#111111] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-base-300 dark:border-white/10 overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-base-200 dark:border-white/5 shrink-0">
                    <h3 className="text-xl sm:text-2xl font-bold dark:text-white uppercase tracking-tighter">{team ? 'Edit Team' : 'Add New Team'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-base-content dark:hover:text-white text-3xl leading-none p-2">&times;</button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                    <form id="team-modal-form" onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="team-name" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1.5 ml-1">Team Name</label>
                            <input type="text" id="team-name" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-3 border border-base-300 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-inner bg-base-100 text-base-content dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 placeholder-gray-400" />
                        </div>
                        <div>
                            <label htmlFor="team-description" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1.5 ml-1">Description</label>
                            <textarea id="team-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 border border-base-300 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-inner bg-base-100 text-base-content dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 placeholder-gray-400" />
                        </div>
                        <div>
                            <label htmlFor="members" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1.5 ml-1">Assign Members</label>
                            <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-2 italic">Hold Ctrl (or Cmd on Mac) to select multiple members.</p>
                            <select
                                id="members"
                                multiple
                                value={memberIds}
                                onChange={e => setMemberIds(Array.from(e.target.selectedOptions, option => (option as HTMLOptionElement).value))}
                                className="w-full h-48 px-4 py-3 border border-base-300 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-inner bg-base-100 text-base-content dark:bg-gray-900 dark:border-gray-700 dark:text-white custom-scrollbar"
                            >
                                {allUsers.map(user => (
                                    <option key={user.id} value={user.id!} className="p-2 dark:text-white">{user.name}</option>
                                ))}
                            </select>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 p-6 border-t border-base-200 dark:border-white/5 shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-brand-tertiary transition-colors w-full sm:w-auto">Cancel</button>
                    <button type="submit" form="team-modal-form" className="px-10 py-3 bg-brand-primary text-brand-primary-content font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-xs uppercase tracking-widest min-w-[180px] w-full sm:w-auto">Save</button>
                </div>
            </div>
        </div>
    );
};

export default TeamModal;
