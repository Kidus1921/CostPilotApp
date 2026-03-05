
import React, { useState, useEffect } from 'react';
import { User, UserRole, UserStatus, Team } from '../types';
import { XIcon, UserGroupIcon, EnvelopeIcon } from './IconComponents';

interface UserModalProps {
    user: User | null;
    teams: Team[];
    onClose: () => void;
    onSave: (user: User, password?: string) => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, teams, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<User>>({
        name: '',
        email: '',
        phone: '',
        role: UserRole.ProjectManager,
        status: UserStatus.Active,
        teamId: null,
    });
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

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

    useEffect(() => {
        if (user) {
            setFormData({
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
                status: user.status,
                teamId: user.teamId || null,
            });
        } else {
            setFormData({
                name: '',
                email: '',
                phone: '',
                role: UserRole.ProjectManager,
                status: UserStatus.Active,
                teamId: null,
            });
            setPassword('');
            setConfirmPassword('');
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, teamId: val === "" ? null : val }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanName = formData.name?.trim() || '';
        const cleanEmail = formData.email?.trim() || '';

        if (!cleanName || !cleanEmail) {
            alert('Core identifiers (Name and Email) are mandatory.');
            return;
        }
        if (!user && !password) {
            alert('Initial access credential (password) is required.');
            return;
        }
        if (password && password !== confirmPassword) {
            alert('Access credential mismatch. Verify and retry.');
            return;
        }

        const dataToSave: User = {
            ...formData as User,
            name: cleanName,
            email: cleanEmail,
            phone: formData.phone || '',
            role: formData.role || UserRole.ProjectManager,
            status: formData.status || UserStatus.Active,
            teamId: formData.teamId || null 
        };

        onSave(dataToSave, password || undefined);
    };

    const inputBaseClass = "block w-full px-4 py-3 rounded-xl border border-base-300 dark:border-white/10 shadow-inner focus:ring-2 focus:ring-brand-primary outline-none transition-all bg-base-200/50 dark:bg-black/40 text-black dark:text-white sm:text-sm placeholder-gray-400";
    const labelBaseClass = "block text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1.5 ml-1";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex justify-center items-center p-4 animate-fadeIn">
            <div className="bg-base-100 dark:bg-[#111111] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-base-300 dark:border-white/10 overflow-hidden relative">
                
                <button onClick={onClose} className="absolute top-6 right-8 z-[160] p-3 text-gray-400 hover:text-brand-tertiary transition-all rounded-full hover:bg-base-200 dark:hover:bg-white/5 active:scale-90 hidden sm:block">
                    <XIcon className="w-8 h-8" />
                </button>

                {/* Header */}
                <div className="px-6 sm:px-10 py-8 border-b border-base-200 dark:border-white/5 shrink-0 flex justify-between items-center sm:block">
                    <div>
                        <h3 className="text-xl sm:text-2xl font-black text-base-content dark:text-white uppercase tracking-tighter">
                            {user ? 'Edit Agent Profile' : 'Initialize Agent'}
                        </h3>
                        <p className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.3em] mt-1">Identity Registry Access</p>
                    </div>
                    <button onClick={onClose} className="sm:hidden text-gray-400 hover:text-brand-tertiary p-2">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                    <form id="user-registry-form" onSubmit={handleSubmit} className="space-y-8">
                        {/* Identity Group */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-base-200 dark:border-white/5 pb-2">
                               Basic Identifier
                            </div>
                            <div>
                                <label className={labelBaseClass}>Full Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputBaseClass} required placeholder="Enter primary identity" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelBaseClass}>Email Relay</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} className={`${inputBaseClass} ${!!user ? 'opacity-50 cursor-not-allowed' : ''}`} required disabled={!!user} placeholder="agent@domain.com" />
                                </div>
                                <div>
                                    <label className={labelBaseClass}>Secure Contact</label>
                                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputBaseClass} placeholder="+251 9..." />
                                </div>
                            </div>
                        </div>

                        {/* Access Credentials Group */}
                        {!user && (
                            <div className="space-y-6 pt-6">
                                <div className="flex items-center gap-2 mb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-base-200 dark:border-white/5 pb-2">
                                   Initial Access Logic
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className={labelBaseClass}>Entry Key</label>
                                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputBaseClass} required placeholder="••••••••" />
                                    </div>
                                    <div>
                                        <label className={labelBaseClass}>Confirm Key</label>
                                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputBaseClass} required placeholder="••••••••" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Authority Matrix Group */}
                        <div className="space-y-6 pt-6 pb-4">
                            <div className="flex items-center gap-2 mb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-base-200 dark:border-white/5 pb-2">
                                Authority Matrix
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelBaseClass}>Operational Role</label>
                                    <select name="role" value={formData.role} onChange={handleChange} className={`${inputBaseClass} cursor-pointer`}>
                                        {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelBaseClass}>Functional Team</label>
                                    <select name="teamId" value={formData.teamId || ''} onChange={handleTeamChange} className={`${inputBaseClass} cursor-pointer`}>
                                        <option value="">Independent Agent</option>
                                        {teams.map(t => <option key={t.id} value={t.id!}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 sm:px-10 py-6 sm:py-8 border-t border-base-200 dark:border-white/5 bg-base-200/40 dark:bg-white/[0.02] flex flex-col sm:flex-row justify-end gap-4 shrink-0">
                    <button type="button" onClick={onClose} className="px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-brand-tertiary transition-colors w-full sm:w-auto">Abort</button>
                    <button 
                        form="user-registry-form"
                        type="submit" 
                        className="px-12 py-3.5 bg-brand-primary text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all w-full sm:w-auto"
                    >
                        {user ? 'Update Registry' : 'Deploy Agent'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserModal;
