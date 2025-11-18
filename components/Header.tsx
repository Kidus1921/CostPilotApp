


import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, BellIcon, SunIcon, MoonIcon } from './IconComponents';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Notification, User } from '../types';
import NotificationPanel from './notifications/NotificationPanel';
import Avatar from './Avatar';

interface HeaderProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    setActivePage: (page: string) => void;
    currentUser: User;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, setActivePage, currentUser, onLogout }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  
  const currentUserId = currentUser.id;

  useEffect(() => {
    if (!currentUserId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUserId)
      // orderBy('timestamp', 'desc') // Removed to prevent index error. Sorting is now done on the client.
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notifs: Notification[] = [];
      querySnapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() } as Notification);
      });
      
      // Sort on the client-side to avoid needing a composite index in Firestore
      notifs.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return b.timestamp.toMillis() - a.timestamp.toMillis();
        }
        return 0;
      });

      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
            setIsPanelOpen(false);
        }
        if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
            setIsProfileOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelRef, profileRef]);


  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  const handleProfileClick = (page: string) => {
    setActivePage(page);
    setIsProfileOpen(false);
  };

  return (
    <header className="flex items-center justify-between h-20 px-6 bg-base-100 border-b border-base-300 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center">
        <div className="relative">
          <SearchIcon className="absolute w-5 h-5 text-gray-400 top-1/2 left-3 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects, reports..."
            className="w-full max-w-xs pl-10 pr-4 py-2 border rounded-full bg-base-200 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400"
          />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary dark:hover:bg-gray-700"
            aria-label="Toggle theme"
        >
            {theme === 'light' ? (
                <MoonIcon className="w-6 h-6 text-gray-500" />
            ) : (
                <SunIcon className="w-6 h-6 text-yellow-500" />
            )}
        </button>
        <div className="relative" ref={panelRef}>
          <button onClick={() => setIsPanelOpen(prev => !prev)} className="relative p-2 rounded-full hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary dark:hover:bg-gray-700">
            <BellIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-secondary text-white text-xs items-center justify-center">{unreadCount}</span>
              </span>
            )}
          </button>
          {isPanelOpen && (
            <NotificationPanel
                notifications={notifications}
                onClose={() => setIsPanelOpen(false)}
                onViewAll={() => {
                    setActivePage('Notifications');
                    setIsPanelOpen(false);
                }}
            />
          )}
        </div>
        
        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button onClick={() => setIsProfileOpen(prev => !prev)} className="flex items-center focus:outline-none rounded-full p-1 hover:bg-base-200 dark:hover:bg-gray-700">
            <Avatar name={currentUser.name} />
            <div className="ml-3 text-left hidden sm:block">
              <p className="text-sm font-semibold text-base-content dark:text-gray-100">{currentUser.name}</p>
              <p className="text-xs text-base-content-secondary dark:text-gray-400">{currentUser.role}</p>
            </div>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-base-100 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-20 dark:bg-gray-800 dark:ring-gray-700">
                <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); handleProfileClick('Settings'); }}
                    className="block px-4 py-2 text-sm text-base-content hover:bg-base-200 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                    Profile Settings
                </a>
                 <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); onLogout(); }}
                    className="block px-4 py-2 text-sm text-base-content hover:bg-base-200 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                    Sign out
                </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;