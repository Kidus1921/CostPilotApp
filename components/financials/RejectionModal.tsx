import React, { useState } from 'react';
import { Project } from '../../types';

interface RejectionModalProps {
    project: Project;
    onClose: () => void;
    onConfirm: (project: Project, reason: string) => void;
}

const RejectionModal: React.FC<RejectionModalProps> = ({ project, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            alert('A reason for rejection is required.');
            return;
        }
        onConfirm(project, reason);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md dark:bg-gray-800">
                <h3 className="text-lg font-bold mb-4 dark:text-white">Reject Project: {project.title}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="rejectionReason" className="block text-sm font-medium text-base-content-secondary dark:text-gray-400">Reason for Rejection</label>
                        <textarea
                            id="rejectionReason"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            required
                            rows={4}
                            className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-base-200 text-base-content font-bold py-2 px-4 rounded-lg hover:bg-base-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-700">Confirm Rejection</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RejectionModal;