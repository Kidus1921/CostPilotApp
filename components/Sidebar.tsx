
import React from 'react';
import { DashboardIcon, ProjectsIcon, ReportsIcon, FinanceIcon, SettingsIcon, FolderIcon } from './IconComponents';

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
        : 'text-gray-500 hover:bg-teal-50 hover:text-brand-primary'
    }`}
  >
    {icon}
    <span className="ml-4">{label}</span>
  </button>
);

interface SidebarProps {
    activePage: string;
    setActivePage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const navItems = [
    { label: 'Dashboard', icon: <DashboardIcon className="w-6 h-6" /> },
    { label: 'Projects', icon: <ProjectsIcon className="w-6 h-6" /> },
    { label: 'Reports', icon: <ReportsIcon className="w-6 h-6" /> },
    { label: 'Financials', icon: <FinanceIcon className="w-6 h-6" /> },
    { label: 'Settings', icon: <SettingsIcon className="w-6 h-6" /> },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-base-100 shadow-lg">
      <div className="flex items-center justify-center h-20 border-b">
        <FolderIcon className="w-8 h-8 text-brand-primary" />
        <h1 className="text-2xl font-bold ml-2 text-base-content">CostPilot</h1>
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
       <div className="px-4 py-6 border-t">
          <div className="p-4 bg-teal-50 rounded-lg text-center">
              <h3 className="font-bold text-brand-primary">Need Help?</h3>
              <p className="text-sm text-gray-600 mt-2">Check our documentation or contact support.</p>
              <button className="mt-4 w-full bg-brand-primary text-white py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors">
                  Contact Us
              </button>
          </div>
       </div>
    </div>
  );
};

export default Sidebar;
