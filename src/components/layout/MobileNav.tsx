import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Target,
  Megaphone,
  Menu,
  X,
  CalendarRange,
  Sparkles,
  Briefcase,
  Settings,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { brandConfig } from '../../config/brand.config';

export const MobileNav: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { profile, isAdmin, logout } = useAuth();

  // Exactly 5 bottom tabs as requested: Home, Daily, Goals, Plans, More
  const primaryTabs = [
    { path: '/', label: 'Home', icon: LayoutDashboard },
    { path: '/daily', label: 'Daily', icon: CalendarDays },
    { path: '/goals', label: 'Goals', icon: Target },
    { path: '/promotion', label: 'Plans', icon: Megaphone },
  ];

  return (
    <>
      {/* Slide-over Drawer for "More" */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 no-print"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="absolute bottom-16 right-3 left-3 max-w-sm mx-auto bg-diary-navy text-white rounded-2xl p-4 shadow-2xl border border-diary-gold/30 animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-heading font-semibold text-card-title text-diary-gold">
                More navigation
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 text-white/80"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2 space-y-1">
              <NavLink
                to="/monthly"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-medium min-h-[44px] hover:bg-white/10 text-white/90"
              >
                <CalendarRange className="w-4 h-4 text-diary-gold" />
                <span>Monthly review</span>
              </NavLink>

              <NavLink
                to="/smart-goals"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-medium min-h-[44px] hover:bg-white/10 text-white/90"
              >
                <Sparkles className="w-4 h-4 text-diary-gold" />
                <span>SMART goals</span>
              </NavLink>

              <NavLink
                to="/management"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-medium min-h-[44px] hover:bg-white/10 text-white/90"
              >
                <Briefcase className="w-4 h-4 text-diary-gold" />
                <span>Management systems</span>
              </NavLink>

              <NavLink
                to="/settings"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-medium min-h-[44px] hover:bg-white/10 text-white/90"
              >
                <Settings className="w-4 h-4 text-diary-gold-light" />
                <span>Settings</span>
              </NavLink>

              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-medium min-h-[44px] bg-diary-gold/20 text-white font-semibold"
                >
                  <ShieldCheck className="w-4 h-4 text-diary-gold" />
                  <span>User management</span>
                </NavLink>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-caption text-diary-gold-light/75">
              <span className="truncate">{profile?.name || brandConfig.appName}</span>
              <button
                type="button"
                onClick={() => { logout(); setDrawerOpen(false); }}
                className="min-h-[44px] px-3 flex items-center gap-1.5 text-red-300 hover:text-red-200 font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Tab Bar (5 Tabs, 44px+ tap targets) - Deep Navy with Gold highlights */}
      <nav className="no-print md:hidden fixed bottom-0 left-0 right-0 h-16 bg-diary-navy text-white border-t border-diary-navy-dark shadow-2xl z-40 px-2 flex items-center justify-around">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-diary-gold font-semibold'
                    : 'text-white/70 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] leading-tight tracking-tight">{tab.label}</span>
            </NavLink>
          );
        })}

        {/* 5th Tab: More */}
        <button
          type="button"
          onClick={() => setDrawerOpen(!drawerOpen)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-lg transition-colors ${
            drawerOpen ? 'text-diary-gold font-semibold' : 'text-white/70 hover:text-white'
          }`}
          aria-label="More menu"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight tracking-tight">More</span>
        </button>
      </nav>
    </>
  );
};
