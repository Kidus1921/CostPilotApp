
import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './AppContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ProjectsPage from './components/ProjectsPage';
import ReportsPage from './components/ReportsPage';
import SettingsPage from './components/SettingsPage';
import FinancialsPage from './components/financials/FinancialsPage';
import NotificationsPage from './components/notifications/NotificationsPage';
import LoginPage from './components/LoginPage';
import { UserRole, UserStatus, User } from './types';
import { supabase } from './supabaseClient';

const MainLayout: React.FC = () => {
    const { currentUser, loading, setCurrentUser } = useAppContext();
    const [activePage, setActivePage] = useState('Dashboard');
    const [settingsTab, setSettingsTab] = useState('Profile');
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');

    useEffect(() => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const handleLogin = async (email: string, password?: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password: password || '' });
            if (error) return { success: false, error: error.message };
            if (data.user) await supabase.from('users').update({ lastLogin: new Date().toISOString() }).eq('id', data.user.id);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    const handleSignup = async (email: string, password?: string, name?: string) => {
        try {
            const { data, error } = await supabase.auth.signUp({ email, password: password || '', options: { data: { name } } });
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
                await supabase.from('users').insert([newUser]);
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
            'Reports': [UserRole.Admin],
            'Financials': [UserRole.Admin, UserRole.Finance],
            'Notifications': [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance],
            'Settings': [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance],
        };
        return accessMap[page]?.includes(role) ?? false;
    };

    const handleSetPage = (page: string, subTab?: string) => {
        if (currentUser && hasAccess(page, currentUser.role)) {
            setActivePage(page);
            if (page === 'Settings') setSettingsTab(subTab || 'Profile');
        }
    };

    if (loading) return <div className="flex h-screen w-screen items-center justify-center bg-base-200 dark:bg-gray-900">Loading CostPilot...</div>;

    if (!currentUser) return <LoginPage onLogin={handleLogin} onSignup={handleSignup} />;

    const renderPage = () => {
        if (!hasAccess(activePage, currentUser.role)) return <Dashboard setActivePage={handleSetPage} />;
        
        switch (activePage) {
            case 'Dashboard': return <Dashboard setActivePage={handleSetPage} />;
            case 'Projects': return <ProjectsPage />;
            case 'Reports': return <ReportsPage />;
            case 'Financials': return <FinancialsPage />;
            case 'Notifications': return <NotificationsPage onOpenSettings={() => handleSetPage('Settings', 'Notifications')} />;
            case 'Settings': return <SettingsPage initialTab={settingsTab} />;
            default: return <Dashboard setActivePage={handleSetPage} />;
        }
    };

    return (
        <div className="flex h-screen bg-base-200 text-base-content font-sans dark:bg-gray-900 dark:text-gray-200">
            <Sidebar activePage={activePage} setActivePage={handleSetPage} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header theme={theme} toggleTheme={toggleTheme} setActivePage={handleSetPage} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-base-200 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
                    {renderPage()}
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
