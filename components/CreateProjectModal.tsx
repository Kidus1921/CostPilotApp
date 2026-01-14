
import React, { useState, useEffect } from 'react';
import { Project, User } from '../types';
import { useAppContext } from '../AppContext';

export interface NewProjectData {
    title: string;
    description: string;
    endDate: string;
    teamLeader: User;
    team: User[]; // Full list of members
    tags: string[];
    budget: number;
}

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewProjectData) => void;
    users: User[];
    initialData?: Project;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSave, users, initialData }) => {
    const { teams } = useAppContext();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [endDate, setEndDate] = useState('');
    const [teamLeaderId, setTeamLeaderId] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
    const [tags, setTags] = useState('');
    const [budget, setBudget] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsSaving(false);
            if (initialData) {
                setTitle(initialData.title);
                setDescription(initialData.description || '');
                setEndDate(initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '');
                setTeamLeaderId(initialData.teamLeader?.id || (users.length > 0 ? users[0].id! : ''));
                setSelectedMemberIds(initialData.team?.map(m => m.id!) || []);
                setTags(initialData.tags?.join(', ') || '');
                setBudget(initialData.budget || 0);
                setSelectedTeamIds([]);
            } else {
                setTitle('');
                setDescription('');
                setEndDate('');
                setTeamLeaderId(users.length > 0 ? users[0].id! : '');
                setSelectedMemberIds([]);
                setSelectedTeamIds([]);
                setTags('');
                setBudget(0);
            }
        }
    }, [isOpen, initialData, users]);

    if (!isOpen) return null;

    const toggleMember = (id: string) => {
        setSelectedMemberIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleTeam = (id: string) => {
        setSelectedTeamIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const teamLeader = users.find(u => u.id === teamLeaderId);
        if (!title || !endDate || !teamLeader) {
            alert('Please fill all required fields.');
            return;
        }

        setIsSaving(true);

        const memberIdsSet = new Set<string>(selectedMemberIds);
        
        selectedTeamIds.forEach(tId => {
            const team = teams.find(t => t.id === tId);
            team?.memberIds?.forEach(mId => memberIdsSet.add(mId));
        });

        memberIdsSet.add(teamLeaderId);

        const finalTeam = Array.from(memberIdsSet)
            .map(id => users.find(u => u.id === id))
            .filter((u): u is User => !!u);

        const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);

        // Simulation delay for UX feedback
        setTimeout(() => {
            onSave({ 
                title, 
                description, 
                endDate, 
                teamLeader, 
                team: finalTeam,
                tags: tagsArray, 
                budget 
            });
        }, 1500);
    };

    // Helper to get preview tags
    const previewTags = tags.split(',').map(t => t.trim()).filter(Boolean);

    const inputBaseClass = "w-full px-4 py-3 border border-base-300 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-inner bg-base-100 text-base-content dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 placeholder-gray-400";
    const labelBaseClass = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 ml-1";
    const selectionBoxClass = "w-full h-40 overflow-y-auto border border-base-300 rounded-xl bg-base-200/50 text-base-content dark:bg-gray-950/50 dark:border-gray-800 dark:text-white p-2 custom-scrollbar";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-base-100 dark:bg-[#111111] rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-base-300 dark:border-white/10">
                <div className="flex justify-between items-center mb-8 border-b border-base-200 dark:border-white/5 pb-6">
                    <h2 className="text-2xl font-bold text-base-content dark:text-white uppercase tracking-tighter">
                        {initialData ? 'Update Project' : 'Create Project'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-base-content dark:hover:text-white text-3xl leading-none transition-colors" disabled={isSaving}>&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className={labelBaseClass}>Project Identifier</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Operation Vanguard"
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                required 
                                disabled={isSaving}
                                className={inputBaseClass} 
                            />
                        </div>
                        
                        <div>
                            <label className={labelBaseClass}>Objective Summary</label>
                            <textarea 
                                placeholder="Mission critical briefing..."
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                rows={3} 
                                disabled={isSaving}
                                className={inputBaseClass} 
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelBaseClass}>Assigned Lead</label>
                                <select 
                                    value={teamLeaderId} 
                                    onChange={e => setTeamLeaderId(e.target.value)} 
                                    disabled={isSaving}
                                    className={inputBaseClass}
                                >
                                    {users.map(u => <option key={u.id} value={u.id!} className="bg-base-100 dark:bg-gray-900">{u.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelBaseClass}>Terminal Date</label>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={e => setEndDate(e.target.value)} 
                                    required 
                                    disabled={isSaving}
                                    className={`${inputBaseClass} [color-scheme:light] dark:[color-scheme:dark]`} 
                                />
                            </div>
                        </div>

                        <div className="border-t border-base-200 dark:border-white/5 pt-6 mt-2">
                            <label className={labelBaseClass}>Deployment Force</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Agents</p>
                                    <div className={selectionBoxClass}>
                                        {users.filter(u => u.id !== teamLeaderId).map(u => (
                                            <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-base-300 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedMemberIds.includes(u.id!)}
                                                    onChange={() => toggleMember(u.id!)}
                                                    disabled={isSaving}
                                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-primary focus:ring-brand-primary bg-white dark:bg-gray-900"
                                                />
                                                <span className="text-xs font-medium text-base-content dark:text-gray-300 group-hover:text-brand-primary">{u.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Functional Units</p>
                                    <div className={selectionBoxClass}>
                                        {teams.map(t => (
                                            <label key={t.id} className="flex items-center gap-3 p-2 hover:bg-base-300 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedTeamIds.includes(t.id!)}
                                                    onChange={() => toggleTeam(t.id!)}
                                                    disabled={isSaving}
                                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-primary focus:ring-brand-primary bg-white dark:bg-gray-900"
                                                />
                                                <span className="text-xs font-medium text-base-content dark:text-gray-300 group-hover:text-brand-primary">{t.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                            <div>
                                <label className={labelBaseClass}>Fiscal Credit ($)</label>
                                <input 
                                    type="number" 
                                    value={budget} 
                                    onChange={e => setBudget(Number(e.target.value))} 
                                    min="0" 
                                    disabled={isSaving}
                                    className={inputBaseClass} 
                                />
                            </div>
                            <div className="relative">
                                <label className={labelBaseClass}>Tags</label>
                                <input 
                                    type="text" 
                                    value={tags} 
                                    onChange={e => setTags(e.target.value)} 
                                    placeholder="Phase 1, High Priority, Alpha" 
                                    disabled={isSaving}
                                    className={inputBaseClass} 
                                />
                                {previewTags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5 min-h-[20px]">
                                        {previewTags.map((tag, idx) => (
                                            <span key={idx} className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[10px] font-bold uppercase rounded border border-brand-primary/20">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-8 border-t border-base-200 dark:border-white/5 mt-6">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={isSaving}
                            className="px-6 py-3 bg-transparent text-gray-500 font-bold rounded-xl hover:text-base-content dark:hover:text-white transition-all text-xs uppercase tracking-widest disabled:opacity-30"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className={`
                                relative px-10 py-3 bg-brand-primary text-brand-primary-content font-bold rounded-xl shadow-lg
                                hover:brightness-110 active:scale-95 transition-all text-xs uppercase tracking-widest min-w-[200px]
                                flex items-center justify-center gap-2
                                ${isSaving ? 'opacity-90 cursor-not-allowed shadow-inner' : ''}
                            `}
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-brand-primary-content/30 border-t-brand-primary-content rounded-full animate-spin"></div>
                                    Syncing...
                                </>
                            ) : (
                                initialData ? 'Commit Changes' : 'Create Project'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProjectModal;
