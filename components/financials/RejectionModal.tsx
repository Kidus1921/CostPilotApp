import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { XIcon } from '../IconComponents';

interface RejectionModalProps {
    project: Project;
    onClose: () => void;
    onConfirm: (project: Project, reason: string) => void;
}

const RejectionModal: React.FC<RejectionModalProps> = ({ project, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');

    // Body scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // ESC key handler
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            alert('A reason for rejection is required.');
            return;
        }
        onConfirm(project, reason);
    };

    const inputBaseClass = "block w-full px-4 py-3 rounded-xl border border-base-300 dark:border-white/10 shadow-inner focus:ring-2 focus:ring-red-500 outline-none transition-all bg-base-200/50 dark:bg-black/40 text-black dark:text-white sm:text-sm placeholder-gray-400";
    const labelBaseClass = "block text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1.5 ml-1";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex justify-center items-center p-4 animate-fadeIn">
            <div className="bg-base-100 dark:bg-[#111111] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-base-300 dark:border-white/10 overflow-hidden relative">
                
                {/* Header */}
                <div className="px-6 py-6 border-b border-base-200 dark:border-white/5 shrink-0 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-base-content dark:text-white uppercase tracking-tighter">
                            Reject Project
                        </h3>
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em] mt-1">Approval Denial Protocol</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-brand-tertiary p-2 transition-all">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="rejection-form" onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-4">
                                You are about to deny financial clearance for: <span className="text-base-content dark:text-white">{project.title}</span>
                            </p>
                            <label htmlFor="rejectionReason" className={labelBaseClass}>Reason for Rejection</label>
                            <textarea
                                id="rejectionReason"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                required
                                rows={4}
                                className={inputBaseClass}
                                placeholder="Specify operational or budgetary constraints..."
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-6 border-t border-base-200 dark:border-white/5 bg-base-200/40 dark:bg-white/[0.02] flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-brand-tertiary transition-colors w-full sm:w-auto">Abort</button>
                    <button 
                        form="rejection-form"
                        type="submit" 
                        className="px-8 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition-all w-full sm:w-auto"
                    >
                        Confirm Rejection
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RejectionModal;