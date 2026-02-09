
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
    const { currentUser, loading, authChecked, setActivePage: setContextPage } = useAppContext();
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
        if (!currentUser) {
            hasSyncedRef.current = false;
        }
    }, [authChecked, currentUser]);

    useEffect(() => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const handleLogin = async (email: string, password?: string) => {
        try {
            // Use type casting to bypass property existence check on SupabaseAuthClient
            const { data, error } = await (supabase.auth as any).signInWithPassword({ email, password: password || '' });
            if (error) return { success: false, error: error.message };
            if (data.user) await supabase.from('users').update({ lastLogin: new Date().toISOString() }).eq('id', data.user.id);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    const handleSignup = async (email: string, password?: string, name?: string) => {
        try {
            // Use type casting to bypass property existence check on SupabaseAuthClient
            const { data, error } = await (supabase.auth as any).signUp({ email, password: password || '', options: { data: { name } } });
            if (error) return { success: false, error: error.message };
            if (data.user) {
                const newUser: User = {
                    id: data.user.id,
                    email,
                    name: name || email.split('@')[0],
                    role: UserRole.ProjectManager,
                    status: UserStatus.Active,
                    phone: '',
                    teamId: null,
                    lastLogin: new Date().toISOString(),
                    privileges: []
                };
                // Use upsert to handle cases where the trigger might have already inserted the user
                await supabase.from('users').upsert([newUser], { onConflict: 'id' });
            }
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    const hasAccess = (page: string, role: UserRole): boolean => {
        const accessMap: Record<string, UserRole[]> = {
            'Dashboard': [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance],
            'Projects': [UserRole.Admin, UserRole.ProjectManager],
            'Financials': [UserRole.Admin, UserRole.Finance],
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

    if (!authChecked || (loading && !currentUser)) return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#65081b] font-sans">
            <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-[#d3a200] animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-4 border-b-white/20 animate-[spin_2s_linear_infinite_reverse]"></div>
            </div>
            <div className="text-center">
                <h1 className="text-xl font-bold text-white tracking-[0.3em] uppercase mb-1">EDFM</h1>
                <p className="text-white/60 text-[10px] tracking-widest uppercase animate-pulse">System Loading</p>
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
