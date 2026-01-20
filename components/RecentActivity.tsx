
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef
} from 'react';
import { supabase } from '../supabaseClient';
import { Activity } from '../types';
import {
  FolderIcon,
  CheckCircleIcon,
  ReportsIcon,
  FinanceIcon,
  UserGroupIcon,
  ArrowDownIcon,
  SearchIcon,
  RefreshIcon,
  ClockIcon
} from './IconComponents';

/* ---------------------------------- Config --------------------------------- */

type ActivityDisplayType = 'project' | 'task' | 'report' | 'finance' | 'user';
const PAGE_SIZE = 15;

/* ---------------------------------- Utils --------------------------------- */

const getActivityType = (action: string): ActivityDisplayType => {
  const a = action.toLowerCase();
  if (a.includes('project')) return 'project';
  if (a.includes('task')) return 'task';
  if (a.includes('user') || a.includes('team')) return 'user';
  if (a.includes('expense') || a.includes('finance') || a.includes('budget') || a.includes('fiscal')) return 'finance';
  return 'report';
};

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/* ---------------------------------- Icons --------------------------------- */

const ActivityIcon: React.FC<{ type: ActivityDisplayType }> = ({ type }) => {
  const theme = {
    project: { icon: <FolderIcon className="w-5 h-5 text-brand-primary" />, bg: 'bg-brand-primary/10 border-brand-primary/20' },
    task: { icon: <CheckCircleIcon className="w-5 h-5 text-green-500" />, bg: 'bg-green-500/10 border-green-500/20' },
    report: { icon: <ReportsIcon className="w-5 h-5 text-indigo-500" />, bg: 'bg-indigo-500/10 border-indigo-500/20' },
    finance: { icon: <FinanceIcon className="w-5 h-5 text-brand-tertiary" />, bg: 'bg-brand-tertiary/10 border-brand-tertiary/20' },
    user: { icon: <UserGroupIcon className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-500/10 border-blue-500/20' }
  }[type];

  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${theme.bg} flex-shrink-0 shadow-sm transition-transform hover:scale-105`}>
      {theme.icon}
    </div>
  );
};

/* ------------------------------- Component -------------------------------- */

const RecentActivity: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<ActivityDisplayType | 'all'>('all');
  const [userQuery, setUserQuery] = useState('');
  
  const lastFetchedPage = useRef(-1);

  /* ----------------------------- Data Fetching ----------------------------- */

  const fetchActivities = useCallback(async (page: number, append: boolean = true) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    setError(null);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      const { data, error: dbError } = await supabase
        .from('activities')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(from, to);

      if (dbError) throw dbError;

      const normalized = (data ?? []).map(a => ({
        ...a,
        timestamp: a.timestamp ? new Date(a.timestamp) : new Date()
      }));

      if (normalized.length < PAGE_SIZE) setHasMore(false);
      else setHasMore(true);

      setActivities(prev => {
        if (!append) return normalized;
        const existingIds = new Set(prev.map(p => p.id));
        const filtered = normalized.filter(n => !existingIds.has(n.id));
        return [...prev, ...filtered];
      });

      lastFetchedPage.current = page;
    } catch (err: any) {
      console.error("Activity Fetch Error:", err);
      setError('System could not synchronize with activity registry.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  /* ----------------------------- Lifecycle ----------------------------- */

  useEffect(() => {
    fetchActivities(0, false);

    const channel = supabase
      .channel('realtime-activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activities' },
        payload => {
          const newActivity = {
            ...payload.new,
            timestamp: payload.new.timestamp ? new Date(payload.new.timestamp) : new Date()
          } as Activity;
          
          setActivities(prev => {
            if (prev.some(a => a.id === newActivity.id)) return prev;
            return [newActivity, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActivities]);

  /* ------------------------------- Logic ------------------------------- */

  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      const typeMatch = typeFilter === 'all' || getActivityType(a.action) === typeFilter;
      const actorName = a.user?.name || 'System';
      const userMatch = !userQuery || actorName.toLowerCase().includes(userQuery.toLowerCase());
      return typeMatch && userMatch;
    });
  }, [activities, typeFilter, userQuery]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    fetchActivities(lastFetchedPage.current + 1, true);
  };

  /* --------------------------------- UI ---------------------------------- */

  return (
    <div className="bg-base-100 dark:bg-[#111111] p-6 rounded-2xl border border-base-300 dark:border-white/10 shadow-sm animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h3 className="text-xl font-bold dark:text-white uppercase tracking-tighter">Activity Registry</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Operational Telemetry Log</p>
        </div>
        <button 
          onClick={() => fetchActivities(0, false)} 
          className="p-2 rounded-xl hover:bg-base-200 dark:hover:bg-white/5 transition-all"
          title="Force Refresh"
        >
          <RefreshIcon className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Control Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="relative">
          <SearchIcon className="absolute w-4 h-4 text-gray-400 left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search agents..."
            value={userQuery}
            onChange={e => setUserQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-base-200 dark:bg-[#090909] border border-base-300 dark:border-white/5 rounded-xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as any)}
          className="w-full px-4 py-2.5 bg-base-200 dark:bg-[#090909] border border-base-300 dark:border-white/5 rounded-xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
        >
          <option value="all">All Modules</option>
          <option value="project">Project Management</option>
          <option value="task">Task Lifecycle</option>
          <option value="finance">Fiscal / Budget</option>
          <option value="user">User / Identity</option>
          <option value="report">Analytic Reports</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4 py-10">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-base-200 dark:bg-white/5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-base-200 dark:bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-base-200 dark:bg-white/5 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 px-6 bg-brand-tertiary/5 border border-brand-tertiary/20 rounded-2xl">
          <p className="text-sm font-bold text-brand-tertiary uppercase tracking-widest mb-4">{error}</p>
          <button 
            onClick={() => fetchActivities(0, false)} 
            className="px-6 py-2 bg-brand-tertiary text-white text-xs font-bold rounded-xl uppercase tracking-widest shadow-lg hover:brightness-110 transition-all"
          >
            Retry Handshake
          </button>
        </div>
      ) : filteredActivities.length > 0 ? (
        <>
          <div className="relative">
            <div className="absolute left-5 top-2 bottom-2 w-px bg-base-300 dark:bg-white/5 hidden sm:block" />
            <ul className="space-y-8 relative">
              {filteredActivities.map((activity) => (
                <li key={activity.id} className="flex gap-4 group">
                  <ActivityIcon type={getActivityType(activity.action)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4">
                      <p className="text-sm leading-snug">
                        <span className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-brand-primary transition-colors">
                          {activity.user?.name || 'System'}
                        </span>{' '}
                        <span className="text-gray-500 dark:text-gray-400 font-medium">
                          {activity.action.toLowerCase()}
                        </span>{' '}
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          {activity.details}
                        </span>
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap pt-1">
                        <ClockIcon className="w-3 h-3" />
                        {activity.timestamp ? formatTimeAgo(activity.timestamp) : '...'}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {hasMore && (
            <div className="mt-12 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-8 py-3 bg-base-100 dark:bg-[#1a1a1a] border border-base-300 dark:border-white/10 rounded-xl text-[10px] font-bold text-gray-500 hover:text-brand-primary hover:border-brand-primary transition-all uppercase tracking-[0.2em] shadow-sm disabled:opacity-50"
              >
                <ArrowDownIcon className={`w-4 h-4 ${loadingMore ? 'animate-bounce' : ''}`} />
                {loadingMore ? 'Processing...' : 'Load Archived Feed'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-24 text-gray-400 border-2 border-dashed border-base-200 dark:border-white/5 rounded-2xl">
          <FolderIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-xs font-bold uppercase tracking-[0.3em]">Registry Clean</p>
          <p className="text-[10px] mt-2 font-medium">No activity matching current scope.</p>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
