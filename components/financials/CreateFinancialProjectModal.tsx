
import React, { useState } from 'react';

interface CreateFinancialProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { name: string; estimatedBudget: number }) => void;
}

const CreateFinancialProjectModal: React.FC<CreateFinancialProjectModalProps> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [estimatedBudget, setEstimatedBudget] = useState(0);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || estimatedBudget <= 0) {
            alert('Please provide a valid project name and budget.');
            return;
        }
        onSave({ name, estimatedBudget });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md dark:bg-gray-800">
                <h3 className="text-lg font-bold mb-4 dark:text-white">New Financial Project</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Project Name</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="estimatedBudget" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Estimated Budget ($)</label>
                        <input type="number" id="estimatedBudget" value={estimatedBudget} onChange={e => setEstimatedBudget(Number(e.target.value))} required min="1" className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-base-200 text-base-content font-bold py-2 px-4 rounded-lg hover:bg-base-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" className="bg-brand-primary text-brand-primary-content font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700">Submit for Approval</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFinancialProjectModal;