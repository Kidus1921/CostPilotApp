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
  isProcessingAuth: boolean;
  refreshData: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  logout: () => Promise<void>;
  isAdmin: boolean;
  checkPermission: (permissionId: string) => boolean;
  setActivePage: (page: string, subTab?: string) => void;
  error: string | null;
  isOnline: boolean;
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
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const isAdmin = currentUser?.role === UserRole.Admin;

  const setActivePage = (page: string, subTab?: string) => {
    window.dispatchEvent(
      new CustomEvent('app:navigate', { detail: { page, subTab } })
    );
  };

  // 🔐 DB-Authoritative Profile Fetch (No Fallback)
  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Auth: Profile fetch failed:', error?.message);
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        role: data.role as UserRole,
        status: data.status as UserStatus,
        teamId: data.teamId || null,
        notificationPreferences: data.notificationPreferences || {},
        privileges: data.privileges || [],
        lastLogin: data.lastLogin,
      };
    } catch (err) {
      console.error('Auth: Unexpected profile error:', err);
      return null;
    }
  };

  // 🔐 Authentication Initialization
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth: Session error:', error.message);
          if (error.message.includes('Refresh Token Not Found') || error.message.includes('invalid refresh token')) {
            await supabase.auth.signOut();
            if (mounted) setCurrentUser(null);
          }
        }

        if (session?.user && mounted) {
          setIsProcessingAuth(true);

          const profile = await fetchUserProfile(session.user.id);

          if (!mounted) return;

          if (profile) {
            setCurrentUser(profile);
          } else {
            await supabase.auth.signOut();
            setCurrentUser(null);
          }

          setIsProcessingAuth(false);
        }
      } catch (err) {
        console.error('Auth: Initialization failure:', err);
      } finally {
        if (mounted) {
          setAuthChecked(true);
          setIsProcessingAuth(false);
        }
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setIsProcessingAuth(true);

          const profile = await fetchUserProfile(session.user.id);

          if (!mounted) return;

          if (profile) {
            setCurrentUser(profile);
          } else {
            await supabase.auth.signOut();
            setCurrentUser(null);
          }

          setIsProcessingAuth(false);
        }

        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setProjects([]);
          setUsers([]);
          setTeams([]);
          setNotifications([]);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 🔄 Data Refresh
  const refreshData = useCallback(async () => {
    if (!currentUser) return;

    setError(null);

    try {
      const [p, u, t, n] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('users').select('*').order('name'),
        supabase.from('teams').select('*').order('name'),
        supabase
          .from('notifications')
          .select('*')
          .eq('userId', currentUser.id)
          .order('timestamp', { ascending: false }),
      ]);

      const errors = [p.error, u.error, t.error, n.error].filter(Boolean);
      if (errors.length > 0) {
        setError(errors[0]?.message || 'Unknown synchronization error');
        return;
      }

      if (p.data) setProjects(p.data as Project[]);
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
    } catch (err: any) {
      console.error('Data synchronization error:', err);
      setError(err.message || 'Critical synchronization failure');
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    refreshData();

    const channels = [
      supabase
        .channel('projects')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'projects' },
          refreshData
        ),
      supabase
        .channel('users')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'users' },
          refreshData
        ),
      supabase
        .channel('teams')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'teams' },
          refreshData
        ),
      supabase
        .channel('notifs')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `userId=eq.${currentUser.id}`,
          },
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
      setLoading(false);
    }
  };

  const checkPermission = (permissionId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.Admin) return true;
    return currentUser.privileges?.includes(permissionId) ?? false;
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
        isProcessingAuth,
        refreshData,
        setCurrentUser,
        logout,
        isAdmin,
        checkPermission,
        setActivePage,
        error,
        isOnline,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx)
    throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};