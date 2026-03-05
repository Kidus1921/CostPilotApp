
import React, { useState, useEffect } from 'react';
import { Project, User } from '../../types';
import { useAppContext } from '../../AppContext';

export interface NewProjectData {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    teamLeader: User;
    team: User[];
    tags: string[];
    budget: number;
}

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewProjectData) => Promise<void>;
    users: User[];
    initialData?: Project;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSave, users, initialData }) => {
    const { teams } = useAppContext();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [teamLeaderId, setTeamLeaderId] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
    const [tags, setTags] = useState('');
    const [budget, setBudget] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // ESC key handler
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            setIsSaving(false);
            if (initialData) {
                setTitle(initialData.title || '');
                setDescription(initialData.description || '');
                setStartDate(initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '');
                setEndDate(initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '');
                setTeamLeaderId(initialData.teamLeader?.id || (users.length > 0 ? users[0].id! : ''));
                setSelectedMemberIds(initialData.team?.map(m => m.id!) || []);
                setTags(initialData.tags?.join(', ') || '');
                setBudget(initialData.budget || 0);
                setSelectedTeamIds([]);
            } else {
                setTitle('');
                setDescription('');
                setStartDate(new Date().toISOString().split('T')[0]);
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
        setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const toggleTeam = (id: string) => {
        setSelectedTeamIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const teamLeader = users.find(u => u.id === teamLeaderId);
        if (!title || !startDate || !endDate || !teamLeader) {
            alert('Operational Requirement: Project Identifier, Temporal Range, and Lead Authority are mandatory.');
            return;
        }

        setIsSaving(true);
        try {
            const memberIdsSet = new Set<string>(selectedMemberIds);
            selectedTeamIds.forEach(tId => {
                const team = teams.find(t => t.id === tId);
                team?.memberIds?.forEach(mId => memberIdsSet.add(mId));
            });
            memberIdsSet.add(teamLeaderId);

            const finalTeam = Array.from(memberIdsSet).map(id => users.find(u => u.id === id)).filter((u): u is User => !!u);
            const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);

            await onSave({ title, description, startDate, endDate, teamLeader, team: finalTeam, tags: tagsArray, budget });
        } catch (err: any) {
            console.error("Project Sync Error:", err);
            alert(`Registry Fault: ${err.message || "Database rejected the synchronization request."}`);
            setIsSaving(false);
        }
    };

    const previewTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    const inputBaseClass = "w-full px-4 py-3 border border-base-300 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-inner bg-base-100 text-base-content dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 placeholder-gray-400";
    const labelBaseClass = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 ml-1";
    const selectionBoxClass = "w-full h-40 overflow-y-auto border border-base-300 rounded-xl bg-base-200/50 text-base-content dark:bg-gray-950/50 dark:border-gray-800 dark:text-white p-2 custom-scrollbar";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex justify-center items-center p-4">
            <div className="bg-base-100 dark:bg-[#111111] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-base-300 dark:border-white/10 overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-base-200 dark:border-white/5 shrink-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-base-content dark:text-white uppercase tracking-tighter">
                        {initialData ? 'Update Project' : 'Create Project'}
                    </h2>
                    <button onClick={onClose} disabled={isSaving} className="text-gray-400 hover:text-base-content dark:hover:text-white text-3xl leading-none disabled:opacity-30 p-2">&times;</button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                    <form id="create-project-form" onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className={labelBaseClass}>Project Identifier</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required disabled={isSaving} className={inputBaseClass} />
                        </div>
                        <div>
                            <label className={labelBaseClass}>Objective Summary</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} disabled={isSaving} className={inputBaseClass} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelBaseClass}>Assigned Lead</label>
                                <select value={teamLeaderId} onChange={e => setTeamLeaderId(e.target.value)} disabled={isSaving} className={inputBaseClass}>
                                    {users.map(u => <option key={u.id} value={u.id!}>{u.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelBaseClass}>Start Date</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required disabled={isSaving} className={`${inputBaseClass} dark:[color-scheme:dark] px-2`} />
                                </div>
                                <div>
                                    <label className={labelBaseClass}>End Date</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required disabled={isSaving} className={`${inputBaseClass} dark:[color-scheme:dark] px-2`} />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className={labelBaseClass}>Agents</p>
                                <div className={selectionBoxClass}>
                                    {users.filter(u => u.id !== teamLeaderId).map(u => (
                                        <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-base-300 dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                                            <input type="checkbox" checked={selectedMemberIds.includes(u.id!)} onChange={() => toggleMember(u.id!)} disabled={isSaving} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-primary" />
                                            <span className="text-xs font-medium text-base-content dark:text-gray-300">{u.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className={labelBaseClass}>Functional Units</p>
                                <div className={selectionBoxClass}>
                                    {teams.map(t => (
                                        <label key={t.id} className="flex items-center gap-3 p-2 hover:bg-base-300 dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                                            <input type="checkbox" checked={selectedTeamIds.includes(t.id!)} onChange={() => toggleTeam(t.id!)} disabled={isSaving} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-primary" />
                                            <span className="text-xs font-medium text-base-content dark:text-gray-300">{t.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelBaseClass}>Fiscal Credit ($)</label>
                                <input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))} min="0" disabled={isSaving} className={inputBaseClass} />
                            </div>
                            <div>
                                <label className={labelBaseClass}>Tags (comma separated)</label>
                                <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. Priority, Phase 1" disabled={isSaving} className={inputBaseClass} />
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {previewTags.map((tag, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[10px] font-bold uppercase rounded border border-brand-primary/20">#{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 p-6 border-t border-base-200 dark:border-white/5 shrink-0">
                    <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-3 text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-brand-tertiary transition-colors disabled:opacity-30 w-full sm:w-auto">Cancel</button>
                    <button type="submit" form="create-project-form" disabled={isSaving} className="px-10 py-3 bg-brand-primary text-brand-primary-content font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-xs uppercase tracking-widest min-w-[180px] w-full sm:w-auto">
                        {isSaving ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Synchronizing...
                            </span>
                        ) : (initialData ? 'Update Scope' : 'Deploy Project')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateProjectModal;