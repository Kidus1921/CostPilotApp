
import React, { useState, useEffect } from 'react';
import { Project, User } from '../types';

export interface NewProjectData {
    title: string;
    description: string;
    endDate: string;
    teamLeader: User;
    tags: string[];
    budget: number;
}

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewProjectData) => void;
    users: User[];
    initialData?: Project; // Added for Edit Mode
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSave, users, initialData }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [endDate, setEndDate] = useState('');
    const [teamLeaderId, setTeamLeaderId] = useState('');
    const [tags, setTags] = useState('');
    const [budget, setBudget] = useState(0);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Edit Mode: Populate fields
                setTitle(initialData.title);
                setDescription(initialData.description || '');
                // Ensure date format is YYYY-MM-DD
                setEndDate(initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '');
                setTeamLeaderId(initialData.teamLeader?.id || (users.length > 0 ? users[0].id! : ''));
                setTags(initialData.tags?.join(', ') || '');
                setBudget(initialData.budget || 0);
            } else {
                // Create Mode: Reset fields
                setTitle('');
                setDescription('');
                setEndDate('');
                setTeamLeaderId(users.length > 0 ? users[0].id! : '');
                setTags('');
                setBudget(0);
            }
        }
    }, [isOpen, initialData, users]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const teamLeader = users.find(u => u.id === teamLeaderId);
        if (!title || !endDate || !teamLeader) {
            alert('Please fill all required fields.');
            return;
        }

        const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);

        onSave({ 
            title, 
            description, 
            endDate, 
            teamLeader, 
            tags: tagsArray, 
            budget 
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-base-100 rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-800">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-base-content dark:text-white">
                        {initialData ? 'Edit Project Details' : 'Create New Project'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none dark:hover:text-gray-200">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Project Name</label>
                        <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm bg-base-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Project Description</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm bg-base-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="teamLeader" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Project Manager</label>
                            <select id="teamLeader" value={teamLeaderId} onChange={e => setTeamLeaderId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-base-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md bg-base-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                {users.map(u => <option key={u.id} value={u.id!}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Due Date</label>
                            <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm bg-base-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:[color-scheme:dark]" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="budget" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Estimated Budget ($)</label>
                        <input type="number" id="budget" value={budget} onChange={e => setBudget(Number(e.target.value))} min="0" className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm bg-base-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="tags" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Tags (comma-separated)</label>
                        <input type="text" id="tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. CRM, SaaS, React" className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm bg-base-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-base-200 text-base-content font-bold py-2 px-4 rounded-lg hover:bg-base-300 transition-colors dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white">Cancel</button>
                        <button type="submit" className="bg-brand-primary text-brand-primary-content font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700 transition-colors">
                            {initialData ? 'Update Project' : 'Save Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProjectModal;
