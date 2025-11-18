

import React from 'react';
import { DashboardIcon, ProjectsIcon, ReportsIcon, FinanceIcon, SettingsIcon, FolderIcon, BellIcon } from './IconComponents';
import { User, UserRole } from '../types';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    className={`flex items-center w-full px-4 py-3 text-lg font-medium rounded-lg transition-colors duration-200 text-left ${
      active
        ? 'bg-brand-primary text-white shadow-md'
        : 'text-gray-500 hover:bg-teal-50 hover:text-brand-primary dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
    }`}
  >
    {icon}
    <span className="ml-4">{label}</span>
  </button>
);

interface SidebarProps {
    activePage: string;
    setActivePage: (page: string) => void;
    currentUser: User;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, currentUser }) => {
  const allNavItems = [
    { label: 'Dashboard', icon: <DashboardIcon className="w-6 h-6" />, roles: [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance] },
    { label: 'Projects', icon: <ProjectsIcon className="w-6 h-6" />, roles: [UserRole.Admin, UserRole.ProjectManager] },
    { label: 'Reports', icon: <ReportsIcon className="w-6 h-6" />, roles: [UserRole.Admin] },
    { label: 'Financials', icon: <FinanceIcon className="w-6 h-6" />, roles: [UserRole.Admin, UserRole.Finance] },
    { label: 'Notifications', icon: <BellIcon className="w-6 h-6" />, roles: [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance] },
    { label: 'Settings', icon: <SettingsIcon className="w-6 h-6" />, roles: [UserRole.Admin] },
  ];

  const navItems = allNavItems.filter(item => currentUser && item.roles.includes(currentUser.role));

  return (
    <div className="hidden md:flex flex-col w-64 bg-base-100 shadow-lg dark:bg-gray-800 dark:border-r dark:border-gray-700">
      <div className="flex items-center justify-center h-20 border-b dark:border-gray-700">
        <FolderIcon className="w-8 h-8 text-brand-primary" />
        <h1 className="text-2xl font-bold ml-2 text-base-content dark:text-gray-100">CostPilot</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map(item => (
            <NavItem 
                key={item.label}
                icon={item.icon} 
                label={item.label} 
                active={activePage === item.label}
                onClick={() => setActivePage(item.label)}
            />
        ))}
      </nav>
       <div className="px-4 py-6 border-t dark:border-gray-700">
          <div className="p-4 bg-teal-50 rounded-lg text-center dark:bg-teal-900/20">
              <h3 className="font-bold text-brand-primary dark:text-teal-400">Need Help?</h3>
              <p className="text-sm text-gray-600 mt-2 dark:text-gray-400">Check our documentation or contact support.</p>
              <button className="mt-4 w-full bg-brand-primary text-white py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors">
                  Contact Us
              </button>
          </div>
       </div>
    </div>
  );
};

export default Sidebar;