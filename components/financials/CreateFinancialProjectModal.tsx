
import React, { useState, useEffect } from 'react';
import { XIcon } from '../IconComponents';

interface CreateFinancialProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { name: string; estimatedBudget: number }) => void;
}

const CreateFinancialProjectModal: React.FC<CreateFinancialProjectModalProps> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [estimatedBudget, setEstimatedBudget] = useState(0);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || estimatedBudget <= 0) {
            alert('Please provide a valid project name and budget.');
            return;
        }
        onSave({ name, estimatedBudget });
    };

    const inputBaseClass = "block w-full px-4 py-3 rounded-xl border border-base-300 dark:border-white/10 shadow-inner focus:ring-2 focus:ring-brand-primary outline-none transition-all bg-base-200/50 dark:bg-black/40 text-black dark:text-white sm:text-sm placeholder-gray-400";
    const labelBaseClass = "block text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1.5 ml-1";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex justify-center items-center p-4 animate-fadeIn">
            <div className="bg-base-100 dark:bg-[#111111] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-base-300 dark:border-white/10 overflow-hidden relative">
                
                {/* Header */}
                <div className="px-6 py-6 border-b border-base-200 dark:border-white/5 shrink-0 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-base-content dark:text-white uppercase tracking-tighter">
                            New Financial Project
                        </h3>
                        <p className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] mt-1">Budgetary Initialization</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-brand-tertiary p-2 transition-all">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="financial-project-form" onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className={labelBaseClass}>Project Name</label>
                            <input 
                                type="text" 
                                id="name" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                required 
                                className={inputBaseClass} 
                                placeholder="Enter operational title"
                            />
                        </div>
                        <div>
                            <label htmlFor="estimatedBudget" className={labelBaseClass}>Estimated Budget ($)</label>
                            <input 
                                type="number" 
                                id="estimatedBudget" 
                                value={estimatedBudget} 
                                onChange={e => setEstimatedBudget(Number(e.target.value))} 
                                required 
                                min="1" 
                                className={inputBaseClass} 
                                placeholder="0.00"
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-6 border-t border-base-200 dark:border-white/5 bg-base-200/40 dark:bg-white/[0.02] flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-brand-tertiary transition-colors w-full sm:w-auto">Abort</button>
                    <button 
                        form="financial-project-form"
                        type="submit" 
                        className="px-8 py-3 bg-brand-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all w-full sm:w-auto"
                    >
                        Submit for Approval
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateFinancialProjectModal;