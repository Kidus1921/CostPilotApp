
import React, { useState, useEffect } from 'react';
import { User, UserRole, UserStatus, Team } from '../types';
import { XIcon } from './IconComponents';

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
            alert('Operation Aborted: Identity Name and Email Terminal are required.');
            return;
        }
        if (!user && !password) {
            alert('Security Violation: Operational Security Key is mandatory for new enrollment.');
            return;
        }
        if (password && password !== confirmPassword) {
            alert('Validation Error: Security Keys do not match.');
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

        // Correctly pass the password to the enrollment handler
        onSave(dataToSave, password || undefined);
    };

    // HIGH INTENSITY NEGATIVE CONTRAST DESIGN
    const inputBaseClass = "mt-1 block w-full px-6 py-4 rounded-2xl shadow-xl focus:ring-4 focus:ring-brand-primary/40 focus:scale-[1.01] outline-none transition-all duration-300 border-none font-black text-base uppercase tracking-tighter selection:bg-brand-primary selection:text-white";
    const themeInputClass = "bg-black text-white dark:bg-white dark:text-black placeholder-gray-500 dark:placeholder-gray-400";

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[150] flex justify-center items-center p-4 animate-fadeIn">
            <div className="bg-base-100 dark:bg-[#0b0b0b] rounded-[3rem] shadow-[0_60px_120px_-20px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-base-300 dark:border-white/10 relative">
                
                <button 
                    onClick={onClose} 
                    className="absolute top-8 right-8 z-[160] p-4 bg-brand-tertiary/10 text-brand-tertiary hover:bg-brand-tertiary hover:text-white transition-all rounded-full shadow-2xl active:scale-90 group"
                    aria-label="Abort"
                >
                    <XIcon className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
                </button>

                <div className="px-12 pt-14 pb-10 border-b border-base-200 dark:border-white/5 bg-base-200/30 dark:bg-white/[0.02]">
                    <h3 className="text-5xl font-black text-base-content dark:text-white uppercase tracking-tighter italic">
                        {user ? 'Sync Identity' : 'Enroll Agent'}
                    </h3>
                    <p className="text-[11px] font-black text-brand-primary uppercase tracking-[0.4em] mt-4">Operational Registry Portal</p>
                </div>

                <form id="user-registry-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">
                    <div className="group">
                        <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 ml-2 group-focus-within:text-brand-primary transition-colors">Legal Identifier (Name)</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className={`${inputBaseClass} ${themeInputClass}`} required placeholder="e.g. CASSIUS LONGINUS" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                        <div className="group">
                            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 ml-2 group-focus-within:text-brand-primary transition-colors">Email Terminal</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={`${inputBaseClass} ${themeInputClass}`} required disabled={!!user} placeholder="agent@costpilot.net" />
                        </div>
                        <div className="group">
                            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 ml-2 group-focus-within:text-brand-primary transition-colors">Comms Frequency (Phone)</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={`${inputBaseClass} ${themeInputClass}`} placeholder="+251..." />
                        </div>
                    </div>

                    {!user && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-6 border-t border-base-200 dark:border-white/5">
                            <div className="group">
                                <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 ml-2 group-focus-within:text-brand-primary transition-colors">Operational Key</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={`${inputBaseClass} ${themeInputClass}`} required />
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 ml-2 group-focus-within:text-brand-primary transition-colors">Verify Key</label>
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`${inputBaseClass} ${themeInputClass}`} required />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                        <div className="group">
                            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 ml-2 group-focus-within:text-brand-primary transition-colors">Clearance Tier</label>
                            <select name="role" value={formData.role} onChange={handleChange} className={`${inputBaseClass} ${themeInputClass} appearance-none cursor-pointer`}>
                                {Object.values(UserRole).map(r => <option key={r} value={r} className="bg-white text-black dark:bg-black dark:text-white">{r}</option>)}
                            </select>
                        </div>
                        <div className="group">
                            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 ml-2 group-focus-within:text-brand-primary transition-colors">Deployment Unit</label>
                            <select name="teamId" value={formData.teamId || ''} onChange={handleTeamChange} className={`${inputBaseClass} ${themeInputClass} appearance-none cursor-pointer`}>
                                <option value="" className="bg-white text-black dark:bg-black dark:text-white">Independent / Unassigned</option>
                                {teams.map(t => <option key={t.id} value={t.id!} className="bg-white text-black dark:bg-black dark:text-white">{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                </form>

                <div className="px-12 py-10 border-t border-base-200 dark:border-white/5 bg-base-200/40 dark:bg-white/[0.02] flex justify-end gap-8">
                    <button type="button" onClick={onClose} className="px-8 py-4 text-[11px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-brand-tertiary transition-colors">Discard</button>
                    <button 
                        form="user-registry-form"
                        type="submit" 
                        className="px-16 py-5 bg-brand-primary text-white text-[11px] font-black uppercase tracking-[0.4em] rounded-[2rem] shadow-[0_25px_50px_-10px_rgba(211,162,0,0.5)] hover:brightness-110 active:scale-95 transition-all"
                    >
                        {user ? 'Synchronize' : 'Authorize Enrollment'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserModal;
