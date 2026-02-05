import React from 'react';
import { Project } from '../../types';
import { 
    XIcon, CalendarIcon, FinanceIcon, UserGroupIcon, 
    FolderIcon
} from '../IconComponents';
import Avatar from '../Avatar';

const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

interface ProjectPreviewModalProps {
    project: Project;
    onClose: () => void;
}

const ProjectPreviewModal: React.FC<ProjectPreviewModalProps> = ({ project, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex justify-center items-center p-4 sm:p-6 animate-fadeIn">
            <div className="bg-base-100 dark:bg-[#111111] rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] w-full max-w-4xl max-h-[85vh] flex flex-col border border-base-300 dark:border-white/10 overflow-hidden transform animate-scaleUp">
                <style>{`
                    @keyframes scaleUp {
                        from { transform: scale(0.95); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                    .animate-scaleUp {
                        animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                `}</style>
                
                {/* Header Section */}
                <div className="p-8 border-b border-base-200 dark:border-white/5 flex justify-between items-center bg-base-200/20 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-brand-primary/10 rounded-2xl">
                            <FolderIcon className="w-8 h-8 text-brand-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Operational Brief</h2>
                            <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em] mt-0.5">Financial Approval Queue</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-3 text-gray-400 hover:text-brand-tertiary transition-all rounded-full hover:bg-base-200 dark:hover:bg-white/5 active:scale-90"
                    >
                        <XIcon className="w-8 h-8" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-4xl font-black dark:text-white uppercase tracking-tighter leading-none">{project.title}</h3>
                        <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed font-medium max-w-3xl">
                            {project.description || "Operational intent summary is currently undefined for this profile."}
                        </p>
                    </div>

                    {/* Stats Surface */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-base-200/50 dark:bg-white/5 p-6 rounded-3xl border border-base-300 dark:border-white/5 shadow-inner">
                            <div className="flex items-center gap-2 mb-4">
                                <FinanceIcon className="w-5 h-5 text-brand-primary" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Initial Credit</span>
                            </div>
                            <p className="text-3xl font-black text-brand-primary">{formatCurrency(project.budget)}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-widest">Requested Ceiling</p>
                        </div>

                        <div className="bg-base-200/50 dark:bg-white/5 p-6 rounded-3xl border border-base-300 dark:border-white/5 shadow-inner">
                            <div className="flex items-center gap-2 mb-4">
                                <CalendarIcon className="w-5 h-5 text-brand-primary" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Deployment Span</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-black dark:text-white">{new Date(project.startDate).toLocaleDateString()}</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase">Commence</p>
                                </div>
                                <div className="h-px w-6 bg-gray-300 dark:bg-white/10"></div>
                                <div className="text-right">
                                    <p className="text-sm font-black dark:text-white">{new Date(project.endDate).toLocaleDateString()}</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase">Terminal</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-base-200/50 dark:bg-white/5 p-6 rounded-3xl border border-base-300 dark:border-white/5 shadow-inner">
                            <div className="flex items-center gap-2 mb-4">
                                <UserGroupIcon className="w-5 h-5 text-brand-primary" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Authority Unit</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Avatar name={project.teamLeader?.name || 'Unknown'} size="sm" className="ring-2 ring-brand-primary/20" />
                                <div>
                                    <p className="text-sm font-black dark:text-white leading-tight">{project.teamLeader?.name}</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{project.teamLeader?.role || 'PM'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Team Section */}
                        <div className="space-y-6">
                            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] border-b border-base-200 dark:border-white/5 pb-3">Operational Agents</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {project.team?.map(member => (
                                    <div key={member.id} className="flex items-center gap-4 p-4 bg-base-100 dark:bg-white/[0.03] border border-base-300 dark:border-white/5 rounded-2xl hover:bg-base-200 transition-colors">
                                        <Avatar name={member.name} size="sm" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-black dark:text-white truncate">{member.name}</p>
                                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{member.role}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!project.team || project.team.length === 0) && (
                                    <p className="text-xs text-gray-400 italic">No agents assigned to initial roster.</p>
                                )}
                            </div>
                        </div>

                        {/* Tasks Preview */}
                        <div className="space-y-6">
                            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] border-b border-base-200 dark:border-white/5 pb-3">Work Package Blueprint</h4>
                            <div className="space-y-3">
                                {project.tasks?.map(task => (
                                    <div key={task.id} className="p-4 bg-base-100 dark:bg-white/[0.03] border border-base-300 dark:border-white/5 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(211,162,0,0.5)]"></div>
                                            <span className="text-xs font-black dark:text-gray-200">{task.name}</span>
                                        </div>
                                        <span className="text-[9px] font-black text-gray-400 uppercase px-3 py-1 border border-base-300 dark:border-white/10 rounded-full bg-base-200/50">{task.status}</span>
                                    </div>
                                ))}
                                {(!project.tasks || project.tasks.length === 0) && (
                                    <p className="text-xs text-gray-400 italic">Operational task registry is currently blank.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="p-8 border-t border-base-200 dark:border-white/5 bg-base-200/30 dark:bg-white/[0.02] flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-10 py-4 bg-brand-primary text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-[0_10px_20px_-5px_rgba(211,162,0,0.4)] hover:shadow-none hover:translate-y-0.5 active:scale-95 transition-all"
                    >
                        Exit Preview
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectPreviewModal;