
import React, { useState } from 'react';
import { FinancialTask, FinancialTaskStatus } from '../../types';

interface CreateFinancialTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<FinancialTask, 'id' | 'variance'>) => void;
    task: FinancialTask | null;
}

const CreateFinancialTaskModal: React.FC<CreateFinancialTaskModalProps> = ({ isOpen, onClose, onSave, task }) => {
    const [name, setName] = useState(task?.name || '');
    const [estimatedCost, setEstimatedCost] = useState(task?.estimatedCost || 0);
    const [actualCost, setActualCost] = useState(task?.actualCost || 0);
    const [status, setStatus] = useState(task?.status || FinancialTaskStatus.NotStarted);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, estimatedCost, actualCost, status });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md dark:bg-gray-800">
                <h3 className="text-lg font-bold mb-4 dark:text-white">{task ? 'Edit Task' : 'Add New Task'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Task Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Estimated Cost</label>
                            <input type="number" value={estimatedCost} onChange={e => setEstimatedCost(Number(e.target.value))} required className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Actual Cost</label>
                            <input type="number" value={actualCost} onChange={e => setActualCost(Number(e.target.value))} required className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Status</label>
                         <select value={status} onChange={e => setStatus(e.target.value as FinancialTaskStatus)} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            {Object.values(FinancialTaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-base-200 text-base-content font-bold py-2 px-4 rounded-lg hover:bg-base-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" className="bg-brand-primary text-brand-primary-content font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700">Save Task</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFinancialTaskModal;