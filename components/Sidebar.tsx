
import React, { useState, useEffect } from 'react';
import { DashboardIcon, ProjectsIcon, FinanceIcon, SettingsIcon, FolderIcon, BellIcon, ArrowLeftIcon } from './IconComponents';
import { UserRole } from '../types';
import { useAppContext } from '../AppContext';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, isCollapsed, onClick }) => (
  <button
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    title={isCollapsed ? label : undefined}
    className={`flex items-center w-full px-4 py-3 text-lg font-medium rounded-lg transition-all duration-200 text-left relative group ${
      active
        ? 'bg-brand-primary text-brand-primary-content shadow-md'
        : 'text-gray-500 hover:bg-teal-50 hover:text-brand-primary dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
    }`}
  >
    <div className={`flex-shrink-0 transition-transform duration-200 ${isCollapsed ? 'mx-auto' : ''}`}>
      {icon}
    </div>
    <span className={`ml-4 transition-all duration-300 origin-left overflow-hidden whitespace-nowrap ${
      isCollapsed ? 'w-0 opacity-0 scale-x-0 invisible absolute' : 'w-auto opacity-100 scale-x-100 visible'
    }`}>
      {label}
    </span>
    
    {isCollapsed && (
      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none shadow-lg border border-gray-700">
        {label}
      </div>
    )}
  </button>
);

interface SidebarProps {
    activePage: string;
    setActivePage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const { currentUser } = useAppContext();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const allNavItems = [
    { label: 'Dashboard', icon: <DashboardIcon className="w-6 h-6" />, roles: [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance] },
    { label: 'Projects', icon: <ProjectsIcon className="w-6 h-6" />, roles: [UserRole.Admin, UserRole.ProjectManager] },
    { label: 'Financials', icon: <FinanceIcon className="w-6 h-6" />, roles: [UserRole.Admin, UserRole.Finance] },
    { label: 'Notifications', icon: <BellIcon className="w-6 h-6" />, roles: [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance] },
    { label: 'Settings', icon: <SettingsIcon className="w-6 h-6" />, roles: [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance] },
  ];

  const navItems = allNavItems.filter(item => currentUser && item.roles.includes(currentUser.role));

  return (
    <div className={`hidden md:flex flex-col bg-base-100 shadow-lg dark:bg-gray-800 dark:border-r dark:border-gray-700 transition-all duration-300 ease-in-out relative flex-shrink-0 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Brand Header */}
      <div className="flex items-center h-20 border-b dark:border-gray-700 px-4 overflow-hidden">
        <div className={`flex items-center transition-all duration-300 ${isCollapsed ? 'mx-auto' : 'ml-2'}`}>
          <FolderIcon className="w-8 h-8 text-brand-primary flex-shrink-0" />
          <h1 className={`text-2xl font-bold ml-2 text-base-content dark:text-gray-100 transition-all duration-300 whitespace-nowrap ${
            isCollapsed ? 'opacity-0 invisible w-0' : 'opacity-100 visible w-auto'
          }`}>
            CostPilot
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {navItems.map(item => (
            <NavItem 
                key={item.label}
                icon={item.icon} 
                label={item.label} 
                isCollapsed={isCollapsed}
                active={activePage === item.label}
                onClick={() => setActivePage(item.label)}
            />
        ))}
      </nav>

      {/* Toggle Button at the bottom */}
      <div className="p-4 border-t dark:border-gray-700">
        <button 
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full p-2 rounded-lg text-gray-500 hover:bg-base-200 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <div className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}>
            <ArrowLeftIcon className="w-6 h-6" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
