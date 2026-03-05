
import React, { useState, useEffect, useRef } from 'react';
import { AppProvider, useAppContext } from './AppContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ProjectsPage from './components/projects/ProjectsPage';
import SettingsPage from './components/SettingsPage';
import FinancialsPage from './components/financials/FinancialsPage';
import NotificationsPage from './components/notifications/NotificationsPage';
import LoginPage from './components/LoginPage';
import { UserRole, UserStatus, User } from './types';
import { supabase } from './supabaseClient';
import { runSystemHealthChecks } from './services/notificationService';

const MainLayout: React.FC = () => {
    const { currentUser, authChecked, isProcessingAuth, error, isOnline, refreshData, setActivePage: setContextPage, backendStatus } = useAppContext();
    const [activePage, setActivePage] = useState('Dashboard');
    
    const [subTab, setSubTab] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
    
    const hasSyncedRef = useRef(false);

    useEffect(() => {
        const handleNavigate = (e: any) => {
            const { page, subTab } = e.detail;
            setActivePage(page);
            setSubTab(subTab || '');
        };
        window.addEventListener('app:navigate', handleNavigate);
        return () => window.removeEventListener('app:navigate', handleNavigate);
    }, []);

    useEffect(() => {
        if (authChecked && currentUser && !hasSyncedRef.current) {
            runSystemHealthChecks();
            hasSyncedRef.current = true;
        }
        if (!currentUser) hasSyncedRef.current = false;
    }, [authChecked, currentUser]);

    useEffect(() => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const handleLogin = async (email: string, password?: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password: password || '' });
            if (error) {
                return { success: false, error: error.message };
            }
            
            if (data.user) {
                // Non-blocking update to avoid hanging the UI
                supabase.from('users')
                    .update({ lastLogin: new Date().toISOString() })
                    .eq('id', data.user.id)
                    .then(({ error: updateError }) => {
                        // Silent update
                    });
            }
            
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    const handleSignup = async (email: string, password?: string, name?: string) => {
        try {
            const { data, error } = await supabase.auth.signUp({ 
                email, 
                password: password || '', 
                options: { data: { name } } 
            });
            if (error) return { success: false, error: error.message };
            // Note: DB insert is handled by public.sync_user_registry trigger
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    const hasAccess = (page: string, role: UserRole): boolean => {
        const accessMap: Record<string, UserRole[]> = {
            'Dashboard': [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance],
            'Projects': [UserRole.Admin, UserRole.ProjectManager],
            'Financials': [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance],
            'Notifications': [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance],
            'Settings': [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance],
        };
        return accessMap[page]?.includes(role) ?? false;
    };

    const handleSetPage = (page: string, tab?: string) => {
        if (currentUser && hasAccess(page, currentUser.role)) {
            setContextPage(page, tab);
        }
    };

    if (!authChecked) return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#65081b] font-sans">
            <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-[#d3a200] animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-4 border-b-white/20 animate-[spin_2s_linear_infinite_reverse]"></div>
            </div>
            <div className="text-center">
                <h1 className="text-xl font-bold text-white tracking-[0.3em] uppercase mb-1">EDFM</h1>
                <p className="text-white/60 text-[10px] tracking-widest uppercase animate-pulse mb-4">
                    {isProcessingAuth ? 'Synchronizing Profile' : 'System Loading'}
                </p>
                
                {/* Fallback button if stuck */}
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/40 hover:text-white/80 text-[10px] uppercase tracking-widest rounded-lg transition-all border border-white/5"
                >
                    Reload System
                </button>
            </div>
        </div>
    );

    if (!currentUser) {
        return <LoginPage onLogin={handleLogin} onSignup={handleSignup} />;
    }

    const renderPage = () => {
        switch (activePage) {
            case 'Dashboard': return <Dashboard setActivePage={handleSetPage} />;
            case 'Projects': return <ProjectsPage />;
            case 'Financials': return <FinancialsPage initialSubTab={subTab} />;
            case 'Notifications': return <NotificationsPage onOpenSettings={() => handleSetPage('Settings', 'Notifications')} setActivePage={handleSetPage} />;
            case 'Settings': return <SettingsPage initialTab={subTab || 'Profile'} />;
            default: return <Dashboard setActivePage={handleSetPage} />;
        }
    };

    return (
        <div className="flex h-screen bg-base-200 text-black font-sans dark:bg-[#0b0b0b] dark:text-gray-200 overflow-hidden">
            <Sidebar 
                activePage={activePage} 
                setActivePage={handleSetPage} 
                isMobileMenuOpen={isMobileMenuOpen}
                setMobileMenuOpen={setIsMobileMenuOpen}
            />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <Header 
                    theme={theme} 
                    toggleTheme={toggleTheme} 
                    setActivePage={handleSetPage} 
                    onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
                />

                {/* Global System Alerts */}
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4 pointer-events-none">
                    <div className="space-y-2">
                        {backendStatus === 'error' && (
                            <div className="bg-brand-tertiary text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center justify-between animate-pulse pointer-events-auto border border-white/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                    <span className="text-xs font-black uppercase tracking-widest">Backend Fault: Supabase or API unreachable</span>
                                </div>
                            </div>
                        )}
                        {!isOnline && (
                            <div className="bg-brand-tertiary text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center justify-between animate-bounce pointer-events-auto border border-white/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                    <span className="text-xs font-black uppercase tracking-widest">Offline Mode: Registry Access Suspended</span>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="bg-brand-tertiary/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between pointer-events-auto border border-brand-tertiary ring-4 ring-brand-tertiary/20 animate-fadeIn">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Registry Alert</p>
                                        <p className="text-xs font-bold leading-tight">{error}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => refreshData()}
                                    className="ml-6 px-4 py-2 bg-white text-brand-tertiary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-100 transition-all shadow-lg active:scale-95"
                                >
                                    Retry Sync
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <main className="flex-1 overflow-x-hidden overflow-y-auto p-2 sm:p-4 bg-base-200 dark:bg-[#0b0b0b] pb-24 md:pb-4">
                    <div className="w-full h-full text-black dark:text-gray-100">
                        {renderPage()}
                    </div>
                </main>
            </div>
        </div>
    );
};

const App: React.FC = () => (
    <AppProvider>
        <MainLayout />
    </AppProvider>
);

export default App;
