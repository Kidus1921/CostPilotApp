import React, { useState, useEffect } from 'react';
import { User, Priority, Task } from '../types';

export interface NewTaskData {
    name: string;
    description: string;
    assignedTo: User;
    priority: Priority;
    deadline?: string;
    estimatedCost?: number;
}

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewTaskData) => void;
    users: User[];
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onSave, users }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [assignedToId, setAssignedToId] = useState('');
    const [priority, setPriority] = useState<Priority>(Priority.Medium);
    const [deadline, setDeadline] = useState('');
    const [estimatedCost, setEstimatedCost] = useState(0);

    useEffect(() => {
        if (users.length > 0 && !assignedToId) {
            setAssignedToId(users[0].id);
        }
    }, [users, assignedToId]);

    if (!isOpen) return null;

    const resetForm = () => {
        setName('');
        setDescription('');
        if (users.length > 0) setAssignedToId(users[0].id);
        setPriority(Priority.Medium);
        setDeadline('');
        setEstimatedCost(0);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const assignedTo = users.find(u => u.id === assignedToId);
        if (!name || !assignedTo) {
            alert('Please fill all required fields.');
            return;
        }

        onSave({ name, description, assignedTo, priority, deadline, estimatedCost });
        resetForm();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-base-100 rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-base-content">Create New Task</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="task-name" className="block text-sm font-medium text-base-content-secondary">Task Name</label>
                        <input type="text" id="task-name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary bg-base-100" />
                    </div>
                    <div>
                        <label htmlFor="task-description" className="block text-sm font-medium text-base-content-secondary">Description</label>
                        <textarea id="task-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary bg-base-100" />
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="assignedTo" className="block text-sm font-medium text-base-content-secondary">Assign To</label>
                            <select id="assignedTo" value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 border-base-300 focus:outline-none focus:ring-brand-primary rounded-md bg-base-100">
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="task-priority" className="block text-sm font-medium text-base-content-secondary">Priority</label>
                            <select id="task-priority" value={priority} onChange={e => setPriority(e.target.value as Priority)} className="mt-1 block w-full pl-3 pr-10 py-2 border-base-300 focus:outline-none focus:ring-brand-primary rounded-md bg-base-100">
                                {Object.values(Priority).map(p => <option key={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="task-deadline" className="block text-sm font-medium text-base-content-secondary">Deadline</label>
                            <input type="date" id="task-deadline" value={deadline} onChange={e => setDeadline(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary bg-base-100" />
                        </div>
                        <div>
                            <label htmlFor="estimatedCost" className="block text-sm font-medium text-base-content-secondary">Estimated Cost ($)</label>
                            <input type="number" id="estimatedCost" value={estimatedCost} onChange={e => setEstimatedCost(Number(e.target.value))} min="0" className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary bg-base-100" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-base-200 text-base-content font-bold py-2 px-4 rounded-lg hover:bg-base-300 transition-colors">Cancel</button>
                        <button type="submit" className="bg-brand-primary text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700 transition-colors">Create Task</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;
