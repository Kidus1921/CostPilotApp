
import React, { useState, useEffect } from 'react';

export interface NewTaskData {
    name: string;
}

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: NewTaskData) => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');

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

    if (!isOpen) return null;

    const resetForm = () => {
        setName('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            alert('Please enter a task name.');
            return;
        }

        onSave({ name });
        resetForm();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-base-100 dark:bg-[#111111] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-base-300 dark:border-white/10 overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-base-200 dark:border-white/5 shrink-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-base-content dark:text-white uppercase tracking-tighter">Add New Task</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-base-content dark:hover:text-white text-3xl leading-none p-2">&times;</button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                    <form id="create-task-form" onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="task-name" className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1.5 ml-1">Task Name</label>
                            <input type="text" id="task-name" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-3 border border-base-300 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-inner bg-base-100 text-base-content dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 placeholder-gray-400" />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 p-6 border-t border-base-200 dark:border-white/5 shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-brand-tertiary transition-colors w-full sm:w-auto">Cancel</button>
                    <button type="submit" form="create-task-form" className="px-10 py-3 bg-brand-primary text-brand-primary-content font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-xs uppercase tracking-widest min-w-[180px] w-full sm:w-auto">Add Task</button>
                </div>
            </div>
        </div>
    );
};

export default CreateTaskModal;
