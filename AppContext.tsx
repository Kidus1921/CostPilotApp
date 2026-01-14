
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { User, Project, Team, Notification, UserRole, UserStatus } from './types';
import { initSendPulse, syncPushSubscription, unsubscribeFromSendPulse } from './services/sendPulseService';
import { runSystemHealthChecks } from './services/notificationService';

interface AppContextType {
    currentUser: User | null;
    projects: Project[];
    users: User[];
    teams: Team[];
    notifications: Notification[];
    loading: boolean;
    refreshData: () => Promise<void>;
    setCurrentUser: (user: User | null) => void;
    logout: () => Promise<void>;
    isAdmin: boolean;
    checkPermission: (permissionId: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const isAdmin = currentUser?.role === UserRole.Admin;

    const processProjects = (data: any[]): Project[] => {
        return data.map(p => {
            const tasks = p.tasks || [];
            const spent = tasks.reduce((acc: number, task: any) => acc + (task.completionDetails?.actualCost || 0), 0);
            
            let completionPercentage = 0;
            if (tasks.length > 0) {
                const completedTasks = tasks.filter((t: any) => t.status === 'Completed').length;
                completionPercentage = Math.round((completedTasks / tasks.length) * 100);
            } else if (p.status === 'Completed') {
                completionPercentage = 100;
            } else {
                completionPercentage = p.completionPercentage || 0;
            }

            return { ...p, spent, completionPercentage };
        });
    };

    const refreshData = useCallback(async () => {
        if (!currentUser) return;

        try {
            const [projectsRes, usersRes, teamsRes, notifRes] = await Promise.all([
                supabase.from('projects').select('*').order('created_at', { ascending: false }),
                supabase.from('users').select('*').order('name'),
                supabase.from('teams').select('*').order('name'),
                supabase.from('notifications').select('*').eq('userId', currentUser.id).order('timestamp', { ascending: false })
            ]);

            if (projectsRes.data) setProjects(processProjects(projectsRes.data));
            if (usersRes.data) setUsers(usersRes.data as User[]);
            if (teamsRes.data) setTeams(teamsRes.data as Team[]);
            if (notifRes.data) {
                 const processedNotifs = notifRes.data.map((n: any) => ({
                    ...n,
                    timestamp: n.timestamp ? { toDate: () => new Date(n.timestamp) } : null
                }));
                setNotifications(processedNotifs);
            }

        } catch (error) {
            console.error("Global Data Fetch Error:", error);
        }
    }, [currentUser]);

    const fetchUserProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
            
            if (data) {
                const userData = data as User;
                if (!Object.values(UserRole).includes(userData.role)) userData.role = UserRole.ProjectManager;
                userData.teamId = userData.teamId || null;
                userData.privileges = userData.privileges || [];
                
                setCurrentUser(userData);
                initSendPulse(userId);
                syncPushSubscription(userId);
                runSystemHealthChecks(); 
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                     const fallbackUser: User = {
                       id: userId,
                       email: user.email || '',
                       name: user.user_metadata?.name || user.email?.split('@')[0] || 'New User',
                       role: UserRole.ProjectManager,
                       status: UserStatus.Active,
                       phone: '',
                       lastLogin: new Date().toISOString(),
                       privileges: [],
                       teamId: null
                   };
                   setCurrentUser(fallbackUser);
                   await supabase.from('users').insert([fallbackUser]);
                   initSendPulse(userId);
                   syncPushSubscription(userId);
                }
            }
        } catch (e) {
            console.error("Profile Fetch Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                // Set a safety timeout for the loading state
                const safetyTimeout = setTimeout(() => {
                    if (mounted) setLoading(false);
                }, 8000);

                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error("Session Check Error:", error);
                    if (mounted) setLoading(false);
                    clearTimeout(safetyTimeout);
                    return;
                }

                if (session?.user && mounted) {
                    await fetchUserProfile(session.user.id);
                } else if (mounted) {
                    setLoading(false);
                }
                clearTimeout(safetyTimeout);
            } catch (e) {
                console.error("Auth Init Error:", e);
                if (mounted) setLoading(false);
            }
        };

        initAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                setLoading(true);
                await fetchUserProfile(session.user.id);
            } else if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                if (mounted) {
                    setCurrentUser(null);
                    setProjects([]);
                    setUsers([]);
                    setTeams([]);
                    setNotifications([]);
                    setLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            authListener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (currentUser) {
            refreshData();
            const channels = [
                supabase.channel('global_projects').on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, refreshData),
                supabase.channel('global_users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, refreshData),
                supabase.channel('global_teams').on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, refreshData),
                supabase.channel('global_notifs').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `userId=eq.${currentUser.id}` }, refreshData)
            ];
            channels.forEach(c => c.subscribe());
            return () => {
                channels.forEach(c => supabase.removeChannel(c));
            };
        }
    }, [currentUser, refreshData]);

    const logout = async () => {
        setLoading(true);
        try {
            await unsubscribeFromSendPulse();
        } catch (e) {}

        try {
            await supabase.auth.signOut({ scope: 'global' });
        } catch (e) {
             console.error("Error signing out:", e);
        }
        
        // Clear non-critical local storage but keep session logic clean
        localStorage.removeItem('supabase.auth.token');
        
        setCurrentUser(null);
        setProjects([]);
        setUsers([]);
        setTeams([]);
        setNotifications([]);
        setLoading(false);
    };

    const checkPermission = (permissionId: string): boolean => {
        if (!currentUser) return false;
        if (currentUser.role === UserRole.Admin) return true;
        return currentUser.privileges?.includes(permissionId) || false;
    };

    return (
        <AppContext.Provider value={{ currentUser, projects, users, teams, notifications, loading, refreshData, setCurrentUser, logout, isAdmin, checkPermission }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
