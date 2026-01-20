
import React, { useState } from "react";
import {
  DashboardIcon,
  ProjectsIcon,
  FinanceIcon,
  SettingsIcon,
  FolderIcon,
  BellIcon,
  ArrowLeftIcon,
  XIcon,
} from "./IconComponents";
import { UserRole } from "../types";
import { useAppContext } from "../AppContext";

/* =========================================================
   COLOR SYSTEM (NEGATIVE / DARK MODE FIRST)
========================================================= */
const style = `
:root {
  --primary-color: #d3a200;
  --secondary-color: #f9dc5c;
  --tertiary-color: #c41034;
  --dark-red: #65081b;

  --neutral-white: #ffffff;
  --neutral-black: #000000;

  --bg-main: #0b0b0b;
  --bg-surface: #111111;
  --bg-elevated: #1a1a1a;

  --text-primary: #ffffff;
  --text-muted: #b5b5b5;
}

/* Prevent body scrolling when mobile menu is open */
.mobile-menu-open {
  overflow: hidden !important;
  position: fixed;
  width: 100%;
}
`;

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  mobile?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  active,
  isCollapsed,
  onClick,
  mobile,
}) => (
  <button
    onClick={onClick}
    aria-current={active ? "page" : undefined}
    title={isCollapsed ? label : undefined}
    className={`
      group relative flex items-center transition-all duration-300
      ${mobile
        ? "flex-col justify-center gap-1 flex-1 h-full py-1"
        : "w-full px-4 py-3 rounded-xl"
      }
      ${active
        ? mobile
          ? "text-[var(--primary-color)]"
          : "bg-[var(--primary-color)] text-black shadow-lg"
        : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
      }
    `}
  >
    <div
      className={`
        transition-transform duration-300
        ${active ? "scale-110" : "group-hover:scale-105"}
        ${!mobile && isCollapsed ? "mx-auto" : ""}
      `}
    >
      {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, {
        className: "w-6 h-6",
      })}
    </div>

    <span
      className={`
        ${mobile ? "text-[10px] font-bold" : "ml-4 text-sm font-medium"}
        transition-all duration-300 origin-left whitespace-nowrap
        ${!mobile && isCollapsed
          ? "w-0 opacity-0 invisible absolute"
          : "opacity-100 visible"
        }
      `}
    >
      {label}
    </span>

    {!mobile && isCollapsed && (
      <div className="
        absolute left-full ml-3 px-2 py-1
        bg-black text-white text-xs rounded-md
        opacity-0 invisible group-hover:opacity-100 group-hover:visible
        transition-all shadow-xl border border-white/10 z-50
      ">
        {label}
      </div>
    )}
  </button>
);

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  isMobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  isMobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const { currentUser } = useAppContext();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved === "true";
  });

  const toggleSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  const navItems = [
    { label: "Dashboard", icon: <DashboardIcon />, roles: [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance] },
    { label: "Projects", icon: <ProjectsIcon />, roles: [UserRole.Admin, UserRole.ProjectManager] },
    { label: "Financials", icon: <FinanceIcon />, roles: [UserRole.Admin, UserRole.Finance] },
    { label: "Notifications", icon: <BellIcon />, roles: [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance] },
    { label: "Settings", icon: <SettingsIcon />, roles: [UserRole.Admin, UserRole.ProjectManager, UserRole.Finance] },
  ].filter(item => currentUser && item.roles.includes(currentUser.role));

  const mobileMain = navItems.slice(0, 4);

  // Handle body lock to prevent underlying content scroll
  React.useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
  }, [isMobileMenuOpen]);

  return (
    <>
      <style>{style}</style>

      {/* ================= MOBILE FOOTER NAV ================= */}
      <div className="
        md:hidden fixed bottom-0 left-0 right-0 z-[999]
        bg-[var(--bg-elevated)] border-t border-white/10
        backdrop-blur-lg h-16 flex justify-around px-1
        shadow-[0_-4px_15px_rgba(0,0,0,0.3)]
      ">
        {mobileMain.map(item => (
          <NavItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={activePage === item.label}
            isCollapsed={false}
            onClick={() => setActivePage(item.label)}
            mobile
          />
        ))}
      </div>

      {/* ================= MOBILE DRAWER ================= */}
      <div
        className={`
          fixed inset-0 z-[1000] transition-opacity md:hidden
          ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
      >
        {/* Backdrop - Locked */}
        <div 
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen?.(false)}
        />
        
        <div
          className={`
            absolute top-0 left-0 h-full w-72
            bg-[var(--bg-surface)] shadow-2xl
            transition-transform duration-300 ease-out
            ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
            flex flex-col z-[1001]
          `}
          onClick={e => e.stopPropagation()}
        >
          <div className="
            h-20 flex items-center justify-between px-4
            bg-black border-b border-white/10 flex-shrink-0
          ">
            <div className="flex items-center gap-2">
              <img
                  src="/logo.png"
                  alt="EDFM Logo"
                  className="w-7 h-7 object-contain"
              />
              <span className="font-bold text-lg text-white">EDFM</span>
            </div>

            <button 
              onClick={() => setMobileMenuOpen?.(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <XIcon className="w-6 h-6 text-white" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
            {navItems.map(item => (
              <NavItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={activePage === item.label}
                isCollapsed={false}
                onClick={() => {
                  setActivePage(item.label);
                  setMobileMenuOpen?.(false);
                }}
              />
            ))}
          </nav>
          
          <div className="p-4 border-t border-white/10 bg-black/40 text-[10px] text-center text-gray-500 uppercase tracking-widest">
            Unified Platform
          </div>
        </div>
      </div>

      {/* ================= DESKTOP SIDEBAR ================= */}
      <div
        className={`
          hidden md:flex flex-col h-screen
          bg-[var(--bg-surface)] border-r border-white/10
          transition-all duration-300 flex-shrink-0
          ${isCollapsed ? "w-20" : "w-64"}
        `}
      >
        <div className="
          h-20 flex items-center border-b border-white/10 bg-black
        ">
          <div className={`flex items-center transition-all ${isCollapsed ? "mx-auto" : "ml-4"}`}>
            <FolderIcon className="w-8 h-8 text-[var(--primary-color)]" />
            {!isCollapsed && (
              <span className="ml-2 text-xl font-bold text-white">EDFM</span>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map(item => (
            <NavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={activePage === item.label}
              isCollapsed={isCollapsed}
              onClick={() => setActivePage(item.label)}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={toggleSidebar}
            className="
              w-full flex items-center justify-center
              rounded-xl p-2
              text-[var(--text-muted)]
              hover:text-white hover:bg-white/5
              transition
            "
          >
            <ArrowLeftIcon
              className={`w-6 h-6 transition-transform ${isCollapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
