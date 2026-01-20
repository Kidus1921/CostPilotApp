
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SearchIcon, BellIcon, SunIcon, MoonIcon, FolderIcon, CheckCircleIcon, UserGroupIcon } from './IconComponents';
import NotificationPanel from './notifications/NotificationPanel';
import Avatar from './Avatar';
import { useAppContext } from '../AppContext';

interface HeaderProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    setActivePage: (page: string, subTab?: string) => void;
    onToggleMobileMenu?: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, setActivePage, onToggleMobileMenu }) => {
  const { currentUser, projects, users, notifications, logout } = useAppContext();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(event.target as Node)) setIsPanelOpen(false);
        if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileOpen(false);
        if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsSearchFocused(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return null;
    const query = searchQuery.toLowerCase();

    const filteredProjects = projects.filter(p => p.title.toLowerCase().includes(query)).slice(0, 3);
    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(query)).slice(0, 3);
    
    const allTasks = projects.flatMap(p => (p.tasks || []).map(t => ({ ...t, projectTitle: p.title, projectId: p.id })));
    const filteredTasks = allTasks.filter(t => t.name.toLowerCase().includes(query)).slice(0, 3);

    return { projects: filteredProjects, users: filteredUsers, tasks: filteredTasks };
  }, [searchQuery, projects, users]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleResultClick = (type: 'project' | 'task' | 'user', id?: string) => {
    setSearchQuery('');
    setIsSearchFocused(false);
    if (type === 'project' || type === 'task') {
      // Logic for Project Navigation (assumes ProjectsPage handles URL or State for sub-views)
      setActivePage('Projects'); 
      // In a real router scenario, we would push /projects/:id
    } else if (type === 'user') {
      setActivePage('Settings', 'User Management');
    }
  };

  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-[50] flex items-center justify-between h-20 px-4 sm:px-6 bg-base-100 border-b border-base-300 dark:bg-[#111111] dark:border-white/10 shadow-sm">
      <div className="flex items-center flex-1">
        <button 
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 mr-2 -ml-2 rounded-lg text-gray-500 hover:bg-base-200 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="relative hidden sm:block w-full max-w-md" ref={searchRef}>
          <SearchIcon className="absolute w-5 h-5 text-gray-400 top-1/2 left-3 transform -translate-y-1/2 pointer-events-none" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search scope..." 
            className="w-full pl-10 pr-4 py-2.5 border rounded-full bg-base-200 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-[#090909] dark:border-white/10 dark:text-gray-200 text-sm font-medium" 
          />
          
          {/* Search Results Dropdown */}
          {isSearchFocused && searchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-base-100 dark:bg-[#111111] border border-base-300 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[60] animate-fadeIn">
              <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                {searchResults.projects.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Projects</p>
                    {searchResults.projects.map(p => (
                      <button key={p.id} onClick={() => handleResultClick('project', p.id)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-base-200 dark:hover:bg-white/5 rounded-xl transition-all text-left">
                        <FolderIcon className="w-4 h-4 text-brand-primary" />
                        <span className="text-sm font-bold truncate">{p.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.tasks.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tasks</p>
                    {searchResults.tasks.map(t => (
                      <button key={t.id} onClick={() => handleResultClick('task', t.projectId)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-base-200 dark:hover:bg-white/5 rounded-xl transition-all text-left">
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="text-sm font-bold truncate leading-none">{t.name}</p>
                          <p className="text-[10px] text-gray-500 mt-1 uppercase">In {t.projectTitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.users.length > 0 && (
                  <div>
                    <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Agents</p>
                    {searchResults.users.map(u => (
                      <button key={u.id} onClick={() => handleResultClick('user', u.id)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-base-200 dark:hover:bg-white/5 rounded-xl transition-all text-left">
                        <Avatar name={u.name} size="sm" />
                        <span className="text-sm font-bold truncate">{u.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {/* FIX: Cast values to any[] to fix 'Property length does not exist on type unknown' error */}
                {Object.values(searchResults).every(arr => (arr as any[]).length === 0) && (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-xs font-bold uppercase tracking-widest">No matching records</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-base-200 dark:hover:bg-white/5">
            {theme === 'light' ? <MoonIcon className="w-6 h-6 text-gray-500" /> : <SunIcon className="w-6 h-6 text-brand-primary" />}
        </button>
        <div className="relative" ref={panelRef}>
          <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="relative p-2 rounded-full hover:bg-base-200 dark:hover:bg-white/5">
            <BellIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-secondary text-white text-xs items-center justify-center">{unreadCount}</span>
              </span>
            )}
          </button>
          {isPanelOpen && <NotificationPanel notifications={notifications} onClose={() => setIsPanelOpen(false)} onViewAll={() => { setActivePage('Notifications'); setIsPanelOpen(false); }} />}
        </div>
        <div className="relative" ref={profileRef}>
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center focus:outline-none rounded-full p-1 hover:bg-base-200 dark:hover:bg-white/5">
            <Avatar name={currentUser.name} size="sm" />
            <div className="ml-3 text-left hidden lg:block">
              <p className="text-sm font-semibold text-base-content dark:text-gray-100">{currentUser.name}</p>
              <p className="text-xs text-base-content-secondary dark:text-gray-400">{currentUser.role}</p>
            </div>
          </button>
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-base-100 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-20 dark:bg-[#111111] dark:ring-white/10 border dark:border-white/10">
                <a href="#" onClick={(e) => { e.preventDefault(); setActivePage('Settings'); setIsProfileOpen(false); }} className="block px-4 py-2 text-sm text-base-content hover:bg-base-200 dark:text-gray-200 dark:hover:bg-white/5 uppercase font-bold tracking-tighter">Profile Settings</a>
                <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} className="block px-4 py-2 text-sm text-brand-tertiary hover:bg-base-200 dark:hover:bg-white/5 font-bold uppercase tracking-tighter">Sign out</a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;