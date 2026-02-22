
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

  const isAdmin = currentUser?.role === UserRole.Admin;

  const setActivePage = (page: string, subTab?: string) => {
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

  const fetchUserProfile = async (userId: string, authUser?: any): Promise<User | null> => {
    try {
      console.log("Auth: Fetching profile for", userId);
      
      // Use provided authUser or fetch if missing
      let userToUse = authUser;
      if (!userToUse) {
        const { data } = await supabase.auth.getUser();
        userToUse = data.user;
      }

      if (!userToUse) {
        console.warn("Auth: No auth user found during profile fetch");
        return null;
      }

      const fallbackUser: User = {
        id: userId,
        email: userToUse.email || '',
        name: userToUse.user_metadata?.name || userToUse.email?.split('@')[0] || 'Unknown',
        role: (userToUse.user_metadata?.role as UserRole) || UserRole.ProjectManager,
        status: UserStatus.Active,
        phone: '',
        lastLogin: new Date().toISOString(),
        privileges: [],
        teamId: null,
        notificationPreferences: {}
      };

      // Try to get from DB with a shorter timeout
      console.log("Auth: Querying 'users' table...");
      
      // Use a race to implement a per-query timeout
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error("Query Timeout")), 5000)
      );

      let dbData = null;
      try {
        const result = await Promise.race([queryPromise, timeoutPromise]) as any;
        if (result.error) {
          console.warn('Auth: DB Profile fetch error:', result.error.message);
        } else {
          dbData = result.data;
        }
      } catch (err) {
        console.warn('Auth: Profile query timed out or failed:', err);
      }

      if (dbData) {
        console.log("Auth: Profile found in DB");
        return {
          id: dbData.id,
          name: dbData.name,
          email: dbData.email,
          phone: dbData.phone || '',
          role: dbData.role as UserRole,
          status: dbData.status as UserStatus,
          teamId: dbData.teamId || null,
          notificationPreferences: dbData.notificationPreferences || {},
          privileges: dbData.privileges || [],
          lastLogin: dbData.lastLogin,
        } as User;
      } else {
        console.log("Auth: Profile not found in DB, using fallback and attempting sync");
        
        // Attempt to sync in background
        supabase.from('users').upsert([fallbackUser], { onConflict: 'id' })
          .then(({ error }) => {
            if (error) console.warn('Auth: Background sync failed:', error.message);
            else console.log('Auth: Background sync successful');
          });
        
        return fallbackUser;
      }
    } catch (err) {
      console.error('Auth: Unified Registry Access Error:', err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      console.log("Auth: Initializing...");
      
      // Safety timeout to ensure we don't stay on the loading screen forever
      const safetyTimeout = setTimeout(() => {
        if (mounted) {
          setAuthChecked(prev => {
            if (!prev) {
              console.warn("Auth: Safety timeout reached - proceeding to UI");
              return true;
            }
            return prev;
          });
          setIsProcessingAuth(false);
        }
      }, 15000);

      try {
        console.log("Auth: Fetching session...");
        
        // Remove the race to avoid artificial timeouts, rely on safetyTimeout instead
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Auth: Session error", sessionError);
          // Don't throw, just log and proceed to login
        }

        if (session?.user && mounted) {
          console.log("Auth: Session found for user", session.user.id);
          setIsProcessingAuth(true);
          try {
            // Pass the user object directly to avoid redundant network calls
            const profile = await fetchUserProfile(session.user.id, session.user);
            if (mounted) {
              setCurrentUser(profile);
              console.log("Auth: Profile loaded");
            }
          } catch (profileErr) {
            console.error("Auth: Profile fetch failed", profileErr);
          } finally {
            if (mounted) setIsProcessingAuth(false);
          }
        } else {
          console.log("Auth: No session found");
        }
      } catch (e) {
        console.error("Auth: Initialization failure", e);
      } finally {
        clearTimeout(safetyTimeout);
        if (mounted) {
          console.log("Auth: Initialization complete");
          setAuthChecked(true);
          setIsProcessingAuth(false);
        }
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          setIsProcessingAuth(true);
          try {
            const profile = await fetchUserProfile(session.user.id, session.user);
            if (mounted) {
              setCurrentUser(profile);
            }
          } finally {
            if (mounted) setIsProcessingAuth(false);
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setCurrentUser(null);
            setIsProcessingAuth(false);
            setProjects([]);
            setUsers([]);
            setTeams([]);
            setNotifications([]);
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
            timestamp: x.timestamp ? { toDate: () => new Date(x.timestamp) } : null,
          }))
        );
    } catch (err) {
      console.error('Registry Synchronization Error:', err);
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
        isProcessingAuth,
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
