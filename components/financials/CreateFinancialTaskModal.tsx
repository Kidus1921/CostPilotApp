
import React, { useState, useEffect } from 'react';
import { FinancialTask, FinancialTaskStatus } from '../../types';
import { XIcon } from '../IconComponents';

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
        if (task) {
            setName(task.name);
            setEstimatedCost(task.estimatedCost);
            setActualCost(task.actualCost);
            setStatus(task.status);
        }
    }, [task]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, estimatedCost, actualCost, status });
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
                            {task ? 'Edit Work Package' : 'New Work Package'}
                        </h3>
                        <p className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] mt-1">Task Registry Update</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-brand-tertiary p-2 transition-all">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="financial-task-form" onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className={labelBaseClass}>Task Name</label>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                required 
                                className={inputBaseClass} 
                                placeholder="Enter task identifier"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelBaseClass}>Estimated Cost</label>
                                <input 
                                    type="number" 
                                    value={estimatedCost} 
                                    onChange={e => setEstimatedCost(Number(e.target.value))} 
                                    required 
                                    className={inputBaseClass} 
                                    placeholder="0.00"
                                />
                            </div>
                             <div>
                                <label className={labelBaseClass}>Actual Cost</label>
                                <input 
                                    type="number" 
                                    value={actualCost} 
                                    onChange={e => setActualCost(Number(e.target.value))} 
                                    required 
                                    className={inputBaseClass} 
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelBaseClass}>Status</label>
                             <select 
                                value={status} 
                                onChange={e => setStatus(e.target.value as FinancialTaskStatus)} 
                                className={`${inputBaseClass} cursor-pointer`}
                            >
                                {Object.values(FinancialTaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-6 border-t border-base-200 dark:border-white/5 bg-base-200/40 dark:bg-white/[0.02] flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-brand-tertiary transition-colors w-full sm:w-auto">Abort</button>
                    <button 
                        form="financial-task-form"
                        type="submit" 
                        className="px-8 py-3 bg-brand-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all w-full sm:w-auto"
                    >
                        Save Task
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateFinancialTaskModal;