import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Target,
  Sparkles,
  Megaphone,
  Briefcase,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Users
} from 'lucide-react';
import { brandConfig } from '../../config/brand.config';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse
}) => {
  const { profile, isAdmin, switchDemoUser } = useAuth();
  const showDevTools = import.meta.env.VITE_DEV_TOOLS === 'true';

  const diaryNav = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/daily', label: 'Daily planner', icon: CalendarDays },
    { path: '/monthly', label: 'Monthly review', icon: CalendarRange },
  ];

  const systemsNav = [
    { path: '/goals', label: 'Goal tracker', icon: Target },
    { path: '/smart-goals', label: 'SMART goals', icon: Sparkles },
    { path: '/promotion', label: 'Promotion plans', icon: Megaphone },
    { path: '/management', label: 'Management systems', icon: Briefcase },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`no-print hidden md:flex flex-col bg-diary-navy text-white border-r border-diary-navy-dark sticky top-0 h-screen transition-all duration-200 shrink-0 z-20 shadow-md ${
        collapsed ? 'w-16' : 'w-[232px]'
      }`}
    >
      {/* Brand Top Header - LOGO AND APP NAME APPEAR HERE ONLY */}
      <div className="h-14 shrink-0 border-b border-white/10 px-4 flex items-center justify-between bg-diary-navy-dark/40">
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          <div className="w-8 h-8 rounded-lg bg-diary-gold p-1 flex items-center justify-center shrink-0 shadow-xs">
            <img
              src={brandConfig.logoUrl || '/logo.png'}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-heading font-bold text-card-title text-white tracking-tight block leading-tight truncate">
                {brandConfig.appName}
              </span>
              <span
                className="text-[9.5px] text-diary-gold-light/90 font-medium block leading-tight whitespace-nowrap tracking-tight"
                title={brandConfig.companyName}
              >
                {brandConfig.companyName}
              </span>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
        {/* GROUP 1: DIARY */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-3 pb-1 text-tag text-diary-gold-light uppercase tracking-wider font-semibold opacity-85">
              Diary
            </div>
          )}
          {diaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all ${
                    isActive
                      ? 'border-l-4 border-diary-gold bg-diary-gold/20 text-white font-semibold shadow-xs'
                      : 'border-l-4 border-transparent text-white/80 hover:text-white hover:bg-white/10'
                  } ${collapsed ? 'justify-center px-0' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-diary-gold' : 'text-white/80'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* GROUP 2: PLANS & SYSTEMS */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-3 pb-1 text-tag text-diary-gold-light uppercase tracking-wider font-semibold opacity-85">
              Plans & systems
            </div>
          )}
          {systemsNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all ${
                    isActive
                      ? 'border-l-4 border-diary-gold bg-diary-gold/20 text-white font-semibold shadow-xs'
                      : 'border-l-4 border-transparent text-white/80 hover:text-white hover:bg-white/10'
                  } ${collapsed ? 'justify-center px-0' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-diary-gold' : 'text-white/80'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Admin link if user has is_admin */}
          {isAdmin && (
            <NavLink
              to="/admin"
              title={collapsed ? 'User management' : undefined}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all ${
                  isActive
                    ? 'border-l-4 border-diary-gold bg-diary-gold/20 text-white font-semibold shadow-xs'
                    : 'border-l-4 border-transparent text-white/80 hover:text-white hover:bg-white/10'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${isActive ? 'text-diary-gold' : 'text-white/80'}`} />
                  {!collapsed && <span className="truncate">User management</span>}
                </>
              )}
            </NavLink>
          )}
        </div>

        {/* QUICK SWITCH DEV BLOCK - SHOWN ONLY IF VITE_DEV_TOOLS=true */}
        {showDevTools && !collapsed && (
          <div className="pt-4 border-t border-white/10 px-2">
            <div className="text-tag text-diary-gold-light uppercase font-semibold mb-2 flex items-center gap-1 opacity-80">
              <Users className="w-3 h-3" /> Dev Accounts
            </div>
            <div className="grid grid-cols-3 gap-1 bg-black/25 p-1 rounded-md text-caption">
              <button
                type="button"
                onClick={() => switchDemoUser(1)}
                className="px-1 py-1 rounded text-center text-white/85 hover:bg-white/15"
              >
                User 1
              </button>
              <button
                type="button"
                onClick={() => switchDemoUser(2)}
                className="px-1 py-1 rounded text-center text-white/85 hover:bg-white/15"
              >
                User 2
              </button>
              <button
                type="button"
                onClick={() => switchDemoUser(3)}
                className="px-1 py-1 rounded text-center text-white/85 hover:bg-white/15"
              >
                Admin
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Sidebar Footer User Info */}
      {!collapsed && (
        <div className="shrink-0 p-3 border-t border-white/10 bg-diary-navy-dark/60 text-white">
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <div className="w-8 h-8 rounded-full bg-diary-gold text-diary-navy font-heading font-bold text-xs flex items-center justify-center shrink-0">
              {profile?.name?.charAt(0) || 'U'}
            </div>
            <div className="truncate min-w-0">
              <div className="text-[13.5px] font-semibold text-white truncate leading-tight">
                {profile?.name || 'Executive'}
              </div>
              <div className="text-[11px] text-diary-gold-light/75 truncate leading-tight">
                {profile?.business_name || 'Enterprise'}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
