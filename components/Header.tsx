
import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, BellIcon, SunIcon, MoonIcon } from './IconComponents';
import NotificationPanel from './notifications/NotificationPanel';
import Avatar from './Avatar';
import { useAppContext } from '../AppContext';

interface HeaderProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    setActivePage: (page: string) => void;
    onToggleMobileMenu?: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, setActivePage, onToggleMobileMenu }) => {
  const { currentUser, notifications, logout } = useAppContext();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(event.target as Node)) setIsPanelOpen(false);
        if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-[50] flex items-center justify-between h-20 px-4 sm:px-6 bg-base-100 border-b border-base-300 dark:bg-gray-800 dark:border-gray-700 shadow-sm">
      <div className="flex items-center">
        {/* Mobile Hamburger */}
        <button 
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 mr-2 -ml-2 rounded-lg text-gray-500 hover:bg-base-200 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="relative hidden sm:block">
          <SearchIcon className="absolute w-5 h-5 text-gray-400 top-1/2 left-3 transform -translate-y-1/2" />
          <input type="text" placeholder="Search..." className="w-full max-w-xs pl-10 pr-4 py-2 border rounded-full bg-base-200 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
        </div>
        
        {/* Tiny Search for Mobile */}
        <button className="sm:hidden p-2 rounded-full hover:bg-base-200 dark:hover:bg-gray-700">
          <SearchIcon className="w-6 h-6 text-gray-500" />
        </button>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-base-200 dark:hover:bg-gray-700">
            {theme === 'light' ? <MoonIcon className="w-6 h-6 text-gray-500" /> : <SunIcon className="w-6 h-6 text-yellow-500" />}
        </button>
        <div className="relative" ref={panelRef}>
          <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="relative p-2 rounded-full hover:bg-base-200 dark:hover:bg-gray-700">
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
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center focus:outline-none rounded-full p-1 hover:bg-base-200 dark:hover:bg-gray-700">
            <Avatar name={currentUser.name} size="sm" />
            <div className="ml-3 text-left hidden lg:block">
              <p className="text-sm font-semibold text-base-content dark:text-gray-100">{currentUser.name}</p>
              <p className="text-xs text-base-content-secondary dark:text-gray-400">{currentUser.role}</p>
            </div>
          </button>
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-base-100 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-20 dark:bg-gray-800 dark:ring-gray-700">
                <a href="#" onClick={(e) => { e.preventDefault(); setActivePage('Settings'); setIsProfileOpen(false); }} className="block px-4 py-2 text-sm text-base-content hover:bg-base-200 dark:text-gray-200 dark:hover:bg-gray-700">Profile Settings</a>
                <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} className="block px-4 py-2 text-sm text-base-content hover:bg-base-200 dark:text-gray-200 dark:hover:bg-gray-700 font-bold text-red-500">Sign out</a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
