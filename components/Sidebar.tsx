
import React, { useState } from "react";
import {
  DashboardIcon,
  ProjectsIcon,
  FinanceIcon,
  SettingsIcon,
  BellIcon,
  ArrowLeftIcon,
  XIcon,
} from "./IconComponents";
import { UserRole } from "../types";
import { useAppContext } from "../AppContext";

const LOGO_URL = "https://vgubtzdnimaguwaqzlpa.supabase.co/storage/v1/object/sign/assets/logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yY2Q0MmM3Yi04YzY0LTQzYzItYTA3OC00YzgzNDMyYzIwYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvbG9nby5wbmciLCJpYXQiOjE3NzAwNDgwMjQsImV4cCI6ODY1NzY5OTYxNjI0fQ.xAL26M1UaUbJMK5wdZNBbUdR58vPihBK2hovd7rlg38";

/* =========================================================
   COLOR SYSTEM (NEGATIVE / DARK MODE FIRST)
========================================================= */
const style = `
:root {
  --primary-color: #65081b;      /* Deep wine */
  --secondary-color: #d3a200;    /* Gold */
  --tertiary-color: #c41034;     /* Crimson */
  --highlight-color: #f9dc5c;    /* Light Gold */

  --neutral-white: #ffffff;
  --neutral-black: #000000;

  --bg-main: #65081b;
  --bg-surface: #65081b;
  --bg-elevated: #c41034;

  --text-primary: #ffffff;
  --text-muted: #e5e7eb;
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
          ? "text-[var(--secondary-color)]"
          : "bg-[var(--secondary-color)] text-black shadow-lg"
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
        ${mobile ? "text-[10px] font-bold" : "ml-4 text-sm font-medium uppercase tracking-tighter"}
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
        bg-[var(--bg-surface)] border-t border-white/10
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
            flex flex-col items-center justify-center py-10
            bg-transparent border-b border-white/5 flex-shrink-0
          ">
            <div className="bg-white p-3 rounded-2xl w-24 h-24 flex items-center justify-center shadow-2xl mb-6">
              <img src={LOGO_URL} alt="CostPilot Logo" className="w-full h-full object-contain" />
            </div>
            
            <div className="text-center px-4">
              <h1 className="text-[var(--secondary-color)] text-[11px] font-black uppercase tracking-[0.2em] leading-tight">Financial Control</h1>
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.3em] mt-1">Institutional Portal</p>
            </div>

            <button 
              onClick={() => setMobileMenuOpen?.(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
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
          
          <div className="p-4 border-t border-white/5 bg-black/20 text-[10px] text-center text-gray-400 uppercase tracking-[0.3em]">
            Operational Registry
          </div>
        </div>
      </div>

      {/* ================= DESKTOP SIDEBAR ================= */}
      <div
        className={`
          hidden md:flex flex-col h-screen
          bg-[var(--bg-surface)] border-r border-white/10
          transition-all duration-300 flex-shrink-0
          ${isCollapsed ? "w-24" : "w-72"}
        `}
      >
        <div className="
          py-12 flex flex-col items-center border-b border-white/5
        ">
          <div className={`transition-all duration-300 bg-white p-2.5 rounded-2xl flex items-center justify-center shadow-xl ${isCollapsed ? "w-14 h-14" : "w-28 h-28 mb-6"}`}>
            <img src={LOGO_URL} alt="CostPilot Logo" className="w-full h-full object-contain" />
          </div>

          {!isCollapsed && (
            <div className="text-center px-4 animate-fadeIn">
              <h1 className="text-[var(--secondary-color)] text-[11px] font-black uppercase tracking-[0.2em] leading-tight">Financial Control</h1>
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.3em] mt-1">Institutional Portal</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2.5 overflow-y-auto overflow-x-hidden">
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

        <div className="p-4 border-t border-white/5">
          <button
            onClick={toggleSidebar}
            className="
              w-full flex items-center justify-center
              rounded-xl p-3
              text-[var(--text-muted)]
              hover:text-white hover:bg-white/5
              transition-all
            "
          >
            <ArrowLeftIcon
              className={`w-6 h-6 transition-transform duration-500 ${isCollapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
