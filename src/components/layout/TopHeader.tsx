import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Check,
  RefreshCw,
  WifiOff,
  Search,
  Bell,
  MoreVertical,
  Printer,
  Download,
  Settings,
  LogOut,
  CalendarDays,
  Menu,
  Plus,
  ListTodo,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
  CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { useAutosave } from '../../context/AutosaveContext';
import { useAuth } from '../../context/AuthContext';
import { getDailyPage, getPastUnfinishedTodos } from '../../lib/dataService';

interface TopHeaderProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  onOpenQuickCapture?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onToggleSidebar, onOpenQuickCapture }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { status } = useAutosave();
  const { user, profile, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Live alerts & reminders state
  const [pendingTodosCount, setPendingTodosCount] = useState<number>(0);
  const [completedChecksCount, setCompletedChecksCount] = useState<number>(0);
  const [pastUnfinishedCount, setPastUnfinishedCount] = useState<number>(0);
  const [reminderConfig, setReminderConfig] = useState<{ enabled: boolean; time: string }>({
    enabled: true,
    time: '07:00'
  });
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Load live notifications & alerts for today
  useEffect(() => {
    let isMounted = true;
    async function loadAlerts() {
      if (!user) return;
      try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const [dailyData, pastUnfinished] = await Promise.all([
          getDailyPage(user.id, todayStr).catch(() => null),
          getPastUnfinishedTodos(user.id, todayStr).catch(() => ({ count: 0, todos: [] }))
        ]);

        if (!isMounted) return;

        if (dailyData) {
          const pending = (dailyData.todos || []).filter((t) => !t.done).length;
          setPendingTodosCount(pending);
          const checksDone = [
            dailyData.page?.check1,
            dailyData.page?.check2,
            dailyData.page?.check3,
            dailyData.page?.check4
          ].filter(Boolean).length;
          setCompletedChecksCount(checksDone);
        }

        if (pastUnfinished) {
          setPastUnfinishedCount(pastUnfinished.count || 0);
        }

        const savedTime = localStorage.getItem('bizdiary_reminder_time') || '07:00';
        const savedEnabled = localStorage.getItem('bizdiary_reminder_enabled');
        setReminderConfig({
          enabled: savedEnabled !== null ? savedEnabled === 'true' : true,
          time: savedTime
        });

        const dismissedKey = `bizdiary_alerts_dismissed_${user.id}_${todayStr}`;
        setIsDismissed(localStorage.getItem(dismissedKey) === 'true');
      } catch (err) {
        console.error('Failed to load header alerts', err);
      }
    }

    loadAlerts();
    window.addEventListener('focus', loadAlerts);
    return () => {
      isMounted = false;
      window.removeEventListener('focus', loadAlerts);
    };
  }, [user, status, location.pathname]);

  const handleDismissAlerts = () => {
    setIsDismissed(true);
    if (user) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      localStorage.setItem(`bizdiary_alerts_dismissed_${user.id}_${todayStr}`, 'true');
    }
  };

  const hasActionableAlerts = pendingTodosCount > 0 || completedChecksCount < 4 || pastUnfinishedCount > 0;
  const showUnreadBadge = hasActionableAlerts && !isDismissed;

  // Close menus on outside click or Esc
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setUserMenuOpen(false);
        setNotificationOpen(false);
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Determine current page title in sentence case
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/daily')) return 'Daily planner';
    if (path.startsWith('/monthly')) return 'Monthly review';
    if (path.startsWith('/goals')) return 'Goal tracker';
    if (path.startsWith('/smart-goals')) return 'SMART goals';
    if (path.startsWith('/promotion')) return 'Promotion plans';
    if (path.startsWith('/management')) return 'Management systems';
    if (path.startsWith('/settings')) return 'Settings';
    if (path.startsWith('/admin')) return 'User management';
    return 'Diary';
  };

  const isDashboard = location.pathname === '/';

  const handlePrint = () => {
    setMenuOpen(false);
    window.print();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/management?q=${encodeURIComponent(searchQuery)}`);
    setSearchOpen(false);
  };

  return (
    <header className="no-print h-14 bg-white/95 backdrop-blur-sm border-b border-diary-navy/15 px-3 sm:px-4 md:px-6 sticky top-0 z-30 flex items-center justify-between gap-2">
      {/* LEFT: Page title in sentence case */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden md:flex p-1.5 rounded-md hover:bg-diary-cream-light text-diary-navy/70 hover:text-diary-navy transition-colors shrink-0"
            title="Toggle sidebar"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <h1 className="font-heading text-base sm:text-section-title text-diary-navy font-semibold tracking-normal truncate">
          {getPageTitle()}
        </h1>
      </div>

      {/* RIGHT: Saved indicator, search, notifications, primary action, more "⋯", user menu */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Saved Status Indicator */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-tag bg-diary-cream-light border border-diary-navy/20 text-diary-navy shrink-0">
          {status === 'saving' && (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-diary-gold-dark" />
              <span className="hidden sm:inline text-diary-navy font-medium">Saving...</span>
            </>
          )}
          {status === 'saved' && (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              <span className="text-emerald-700 font-semibold text-xs sm:text-tag">Saved</span>
            </>
          )}
          {status === 'offline_queued' && (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline text-amber-700 font-medium">Offline</span>
            </>
          )}
        </div>

        {/* Global Quick Capture Button (Cmd/Ctrl + K) */}
        {onOpenQuickCapture && (
          <button
            type="button"
            onClick={onOpenQuickCapture}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-diary-navy bg-diary-cream-light hover:bg-diary-cream border border-diary-navy/20 rounded-lg transition-all min-h-[34px] shadow-2xs hover:shadow-xs"
            title="Quick capture task to today's diary (Ctrl+K / Cmd+K)"
          >
            <Plus className="w-3.5 h-3.5 text-diary-navy" />
            <span className="font-heading">Capture</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-diary-navy/20 font-mono text-[9px] text-diary-navy/70 leading-none">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Search Trigger (Desktop/Tablet) */}
        <div className="hidden sm:block relative">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 rounded-lg hover:bg-diary-cream-light text-diary-navy/70 hover:text-diary-navy transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Search"
            aria-label="Search diary"
          >
            <Search className="w-4 h-4" />
          </button>

          {searchOpen && (
            <form
              onSubmit={handleSearchSubmit}
              className="absolute right-0 top-11 w-72 bg-white rounded-xl shadow-lg border border-diary-navy/15 p-2 z-50 flex items-center gap-2"
            >
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search systems & challenges..."
                className="flex-1 text-sm px-2 py-1 bg-diary-cream-light/40 rounded border border-diary-navy/20 focus:outline-none focus:ring-1 focus:ring-diary-navy text-diary-navy"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-diary-navy text-white text-xs font-semibold rounded hover:bg-diary-navy-dark"
              >
                Go
              </button>
            </form>
          )}
        </div>

        {/* Notifications Popover Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="flex p-2 rounded-lg hover:bg-diary-cream-light text-diary-navy/70 hover:text-diary-navy transition-colors min-w-[36px] min-h-[36px] items-center justify-center relative active:scale-95"
            title="Notifications & reminders"
            aria-label="Notifications"
            aria-expanded={notificationOpen}
          >
            <Bell className="w-4 h-4" />
            {showUnreadBadge && (
              <span className="w-2.5 h-2.5 rounded-full bg-diary-gold absolute top-1.5 right-1.5 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {notificationOpen && (
            <div className="absolute right-0 top-11 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-2xl border border-diary-navy/20 z-50 overflow-hidden text-diary-navy animate-in fade-in-50 duration-150">
              {/* Header */}
              <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-semibold text-sm text-diary-navy tracking-tight">
                    Notifications & Reminders
                  </span>
                  {hasActionableAlerts && !isDismissed && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-diary-navy text-diary-gold">
                      {pendingTodosCount + (4 - completedChecksCount) + (pastUnfinishedCount > 0 ? 1 : 0)}
                    </span>
                  )}
                </div>
                {hasActionableAlerts && !isDismissed && (
                  <button
                    type="button"
                    onClick={handleDismissAlerts}
                    className="text-xs text-slate-400 hover:text-diary-navy transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {/* 1. Daily Priorities */}
                <div
                  onClick={() => {
                    setNotificationOpen(false);
                    navigate('/daily');
                  }}
                  className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-diary-navy group-hover:text-diary-navy-dark">
                        Daily Priorities
                      </span>
                      {pendingTodosCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                          {pendingTodosCount} pending
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          Complete
                        </span>
                      )}
                    </div>
                    <p className="text-caption text-slate-500 mt-0.5">
                      {pendingTodosCount > 0
                        ? `${pendingTodosCount} task${pendingTodosCount === 1 ? '' : 's'} scheduled for today's review`
                        : 'All scheduled priorities completed for today.'}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-400 group-hover:text-diary-navy shrink-0">
                    Open →
                  </span>
                </div>

                {/* 2. Daily Focus Checks */}
                <div
                  onClick={() => {
                    setNotificationOpen(false);
                    navigate('/daily');
                  }}
                  className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-diary-navy group-hover:text-diary-navy-dark">
                        Focus Checks
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                          completedChecksCount === 4
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-diary-gold/20 text-diary-navy border-diary-gold/40'
                        }`}
                      >
                        {completedChecksCount} of 4 done
                      </span>
                    </div>
                    <p className="text-caption text-slate-500 mt-0.5">
                      {completedChecksCount === 4
                        ? 'All 4 strategic routines logged for today.'
                        : `${4 - completedChecksCount} routine check${
                            4 - completedChecksCount === 1 ? '' : 's'
                          } pending.`}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-400 group-hover:text-diary-navy shrink-0">
                    Review →
                  </span>
                </div>

                {/* 3. Standup / Carry Forward */}
                {pastUnfinishedCount > 0 && (
                  <div
                    onClick={() => {
                      setNotificationOpen(false);
                      navigate('/daily');
                    }}
                    className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-diary-navy group-hover:text-diary-navy-dark">
                          Carry Forward
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          {pastUnfinishedCount} past {pastUnfinishedCount === 1 ? 'task' : 'tasks'}
                        </span>
                      </div>
                      <p className="text-caption text-slate-500 mt-0.5">
                        Unfinished items ready to sweep into today's diary.
                      </p>
                    </div>
                    <span className="text-xs font-medium text-slate-400 group-hover:text-diary-navy shrink-0">
                      Sweep →
                    </span>
                  </div>
                )}

                {/* 4. Daily Planner Reminder Schedule */}
                <div
                  onClick={() => {
                    setNotificationOpen(false);
                    navigate('/settings#reminder-settings');
                  }}
                  className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-diary-navy group-hover:text-diary-navy-dark">
                        Daily Planner Reminder
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        {reminderConfig.enabled ? reminderConfig.time : 'Paused'}
                      </span>
                    </div>
                    <p className="text-caption text-slate-500 mt-0.5">
                      {reminderConfig.enabled
                        ? `Daily briefing prompt scheduled at ${reminderConfig.time}`
                        : 'Device reminder prompt is currently paused.'}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-400 group-hover:text-diary-navy shrink-0">
                    Edit →
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-caption">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationOpen(false);
                    navigate('/settings#reminder-settings');
                  }}
                  className="font-medium text-slate-600 hover:text-diary-navy transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reminder preferences</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationOpen(false);
                    navigate('/settings');
                  }}
                  className="font-medium text-slate-500 hover:text-diary-navy transition-colors cursor-pointer"
                >
                  All settings →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button: "Open today's page" on Dashboard, "Print / PDF" elsewhere */}
        {isDashboard ? (
          <button
            type="button"
            onClick={() => navigate('/daily')}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 bg-diary-navy hover:bg-diary-navy-dark text-white rounded-lg text-xs sm:text-body-medium font-semibold transition-colors shadow-xs active:scale-95 min-h-[36px] shrink-0"
          >
            <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-diary-gold" />
            <span className="hidden sm:inline">Open today's page</span>
            <span className="sm:hidden">Today</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 bg-diary-navy hover:bg-diary-navy-dark text-white rounded-lg text-xs sm:text-body-medium font-semibold transition-colors shadow-xs active:scale-95 min-h-[36px] shrink-0"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-diary-gold" />
            <span className="hidden sm:inline">Print / PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        )}

        {/* "⋯" More Options Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg hover:bg-diary-cream-light text-diary-navy/70 hover:text-diary-navy transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="More actions"
            aria-label="More actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 w-52 bg-white rounded-xl shadow-xl border border-diary-navy/15 py-1.5 z-50 text-sm animate-in fade-in-50 duration-150">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full px-3.5 py-2 text-left text-diary-navy hover:bg-diary-cream-light flex items-center gap-2.5 font-medium"
              >
                <Printer className="w-4 h-4 text-diary-navy/60" />
                <span>Print / Download PDF</span>
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                className="w-full px-3.5 py-2 text-left text-diary-navy hover:bg-diary-cream-light flex items-center gap-2.5 font-medium"
              >
                <Download className="w-4 h-4 text-diary-navy/60" />
                <span>Export data (JSON/CSV)</span>
              </button>
              <div className="my-1 border-t border-diary-navy/10" />
              <button
                type="button"
                onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                className="w-full px-3.5 py-2 text-left text-diary-navy hover:bg-diary-cream-light flex items-center gap-2.5 font-medium"
              >
                <Settings className="w-4 h-4 text-diary-navy/60" />
                <span>Settings</span>
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); logout(); }}
                className="w-full px-3.5 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2.5 font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>

        {/* User Avatar Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-8 h-8 rounded-full bg-diary-navy text-diary-gold font-heading font-semibold text-xs flex items-center justify-center transition-transform active:scale-95 shadow-xs"
            title={profile?.name || user?.name || 'Account'}
            aria-label="User account"
          >
            {profile?.name?.charAt(0) || user?.name?.charAt(0) || 'U'}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-11 w-56 bg-white rounded-xl shadow-xl border border-diary-navy/15 p-3 z-50 animate-in fade-in-50 duration-150">
              <div className="pb-2 border-b border-slate-100 mb-2">
                <p className="text-body-medium font-semibold text-diary-navy truncate">
                  {profile?.name || user?.name || 'Executive'}
                </p>
                <p className="text-caption text-slate-500 truncate">
                  {profile?.business_name || 'My Enterprise'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                className="w-full py-1.5 text-left text-xs font-medium text-slate-700 hover:text-diary-navy flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Profile & settings</span>
              </button>
              <button
                type="button"
                onClick={() => { setUserMenuOpen(false); logout(); }}
                className="w-full py-1.5 text-left text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
