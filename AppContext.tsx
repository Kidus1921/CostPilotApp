
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { supabase } from './supabaseClient';
import {
  User,
  Project,
  Team,
  Notification,
  UserRole,
  UserStatus,
} from './types';

interface AppContextType {
  currentUser: User | null;
  projects: Project[];
  users: User[];
  teams: Team[];
  notifications: Notification[];
  loading: boolean;
  authChecked: boolean;
  refreshData: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  logout: () => Promise<void>;
  isAdmin: boolean;
  checkPermission: (permissionId: string) => boolean;
  // Added setActivePage to context to fix navigation issues in nested components
  setActivePage: (page: string, subTab?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Track active page in context
  const [activePage, setActivePageState] = useState('Dashboard');
  const [activeSubTab, setActiveSubTab] = useState('');

  const isAdmin = currentUser?.role === UserRole.Admin;

  const setActivePage = (page: string, subTab?: string) => {
    setActivePageState(page);
    setActiveSubTab(subTab || '');
    // Dispatch a custom event to notify listeners (MainLayout) of page change
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page, subTab } }));
  };

  const processProjects = (data: any[]): Project[] =>
    data.map((p) => {
      const tasks = p.tasks || [];
      const spent = tasks.reduce(
        (acc: number, t: any) =>
          acc + (t.completionDetails?.actualCost || 0),
        0
      );

      let completionPercentage = 0;
      if (tasks.length) {
        const completed = tasks.filter(
          (t: any) => t.status === 'Completed'
        ).length;
        completionPercentage = Math.round(
          (completed / tasks.length) * 100
        );
      } else if (p.status === 'Completed') {
        completionPercentage = 100;
      }

      return { ...p, spent, completionPercentage };
    });

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      let user: User;
      if (data) {
        user = {
          ...data,
          role: Object.values(UserRole).includes(data.role)
            ? data.role
            : UserRole.ProjectManager,
          teamId: data.teamId ?? null,
          privileges: data.privileges ?? [],
        };
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        user = {
          id: userId,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'New User',
          role: UserRole.ProjectManager,
          status: UserStatus.Active,
          phone: '',
          lastLogin: new Date().toISOString(),
          privileges: [],
          teamId: null,
        };
        await supabase.from('users').insert([user]);
      }

      setCurrentUser(user);
    } catch (err) {
      console.error('Profile fetch error:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        try {
          if (session?.user) {
            if (!currentUser || currentUser.id !== session.user.id) {
                setLoading(true);
                await fetchUserProfile(session.user.id);
            }
          } else {
            setCurrentUser(null);
            setProjects([]);
            setUsers([]);
            setTeams([]);
            setNotifications([]);
          }
        } catch (e) {
          console.error("Auth listener error:", e);
        } finally {
          if (mounted) {
            setAuthChecked(true);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refreshData = useCallback(async () => {
    if (!currentUser) return;

    try {
      const [p, u, t, n] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('*').order('name'),
        supabase.from('teams').select('*').order('name'),
        supabase
          .from('notifications')
          .select('*')
          .eq('userId', currentUser.id)
          .order('timestamp', { ascending: false }),
      ]);

      if (p.data) setProjects(processProjects(p.data));
      if (u.data) setUsers(u.data as User[]);
      if (t.data) setTeams(t.data as Team[]);
      if (n.data)
        setNotifications(
          n.data.map((x: any) => ({
            ...x,
            timestamp: x.timestamp
              ? { toDate: () => new Date(x.timestamp) }
              : null,
          }))
        );
    } catch (err) {
      console.error('Global data fetch error:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    refreshData();
    const channels = [
      supabase.channel('projects').on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, refreshData),
      supabase.channel('users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, refreshData),
      supabase.channel('teams').on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, refreshData),
      supabase.channel('notifs').on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `userId=eq.${currentUser.id}` },
        refreshData
      ),
    ];
    channels.forEach((c) => c.subscribe());
    return () => channels.forEach((c) => supabase.removeChannel(c));
  }, [currentUser, refreshData]);

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setCurrentUser(null);
      setProjects([]);
      setUsers([]);
      setTeams([]);
      setNotifications([]);
      setLoading(false);
    }
  };

  const checkPermission = (permissionId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.Admin) return true;
    return currentUser.privileges?.includes(permissionId) ?? false;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        projects,
        users,
        teams,
        notifications,
        loading,
        authChecked,
        refreshData,
        setCurrentUser,
        logout,
        isAdmin,
        checkPermission,
        setActivePage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};
