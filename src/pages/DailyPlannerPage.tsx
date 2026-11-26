import React, { useState, useEffect, useRef } from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Lightbulb,
  Plus,
  ArrowRight,
  CheckSquare,
  Square,
  Sparkles,
  Link as LinkIcon,
  Clock,
  Zap,
  X,
  RefreshCw,
  Tag
} from 'lucide-react';
import { DiaryPageFrame } from '../components/layout/DiaryPageFrame';
import { useAuth } from '../context/AuthContext';
import { useAutosave } from '../context/AutosaveContext';
import {
  getDailyPage,
  saveDailyPage,
  saveDailyTodos,
  saveDailySchedule,
  carryForwardUnfinishedTodos,
  getGoals,
  getPastUnfinishedTodos,
  rollTodosIntoDate,
  syncDailyTicksToMonthlyAudit,
  DEFAULT_TIME_SLOTS
} from '../lib/dataService';
import { DailyPage, DailyTodo, DailySchedule, Goal } from '../types/database';

const CATEGORY_CYCLE: Array<'strategy' | 'sales' | 'systems' | 'operations' | undefined> = [
  undefined,
  'strategy',
  'sales',
  'systems',
  'operations'
];

const CATEGORY_MAP: Record<string, { label: string; badge: string }> = {
  strategy: { label: 'Strategy', badge: 'bg-diary-gold/25 text-diary-navy border-diary-gold/40' },
  sales: { label: 'Sales', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  systems: { label: 'Systems', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  operations: { label: 'Ops', badge: 'bg-diary-navy/15 text-diary-navy border-diary-navy/25' }
};

export const DailyPlannerPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { triggerSave } = useAutosave();

  const [selectedDate, setSelectedDate] = useState<string>(
    () => format(new Date(), 'yyyy-MM-dd')
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [pageData, setPageData] = useState<DailyPage | null>(null);
  const [todos, setTodos] = useState<DailyTodo[]>([]);
  const [schedule, setSchedule] = useState<DailySchedule[]>([]);
  const [goalsList, setGoalsList] = useState<Goal[]>([]);
  const [carryNotification, setCarryNotification] = useState<string | null>(null);
  const [showGoalSuggestions, setShowGoalSuggestions] = useState<boolean>(false);
  const [standupSweepData, setStandupSweepData] = useState<{ sourceDate: string; count: number; todos: DailyTodo[] } | null>(null);
  const [activeSlotMenuTodoId, setActiveSlotMenuTodoId] = useState<string | null>(null);
  const [syncingAudit, setSyncingAudit] = useState<boolean>(false);
  const [mobilePlannerView, setMobilePlannerView] = useState<'both' | 'todos' | 'schedule'>('both');

  const todoInputMap = useRef<Map<string, HTMLInputElement>>(new Map());
  const priorityInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusTodoId, setFocusTodoId] = useState<string | null>(null);

  // Auto-focus target todo when created or shifted
  useEffect(() => {
    if (focusTodoId) {
      const el = todoInputMap.current.get(focusTodoId);
      if (el) {
        el.focus();
        setFocusTodoId(null);
      }
    }
  }, [todos, focusTodoId]);

  // Check for past unfinished todos when on today's date
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    async function checkPastTodos() {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      if (selectedDate !== todayStr) {
        setStandupSweepData(null);
        return;
      }

      const pastData = await getPastUnfinishedTodos(user!.id, selectedDate);
      if (!isCancelled && pastData && pastData.count > 0) {
        setStandupSweepData(pastData);
      } else if (!isCancelled) {
        setStandupSweepData(null);
      }
    }

    checkPastTodos();
    return () => {
      isCancelled = true;
    };
  }, [user?.id, selectedDate]);

  // Load daily page data whenever selectedDate or user changes
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [dailyResult, goalsResult] = await Promise.all([
          getDailyPage(user!.id, selectedDate),
          getGoals(user!.id),
        ]);

        if (!isCancelled) {
          setPageData(dailyResult.page);
          setTodos(dailyResult.todos);
          setSchedule(dailyResult.schedule);
          setGoalsList(goalsResult);
        }
      } catch (err) {
        console.error('Failed to load daily page:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [user?.id, selectedDate]);

  // Listen for global Quick Capture additions to update the list live without page reload
  useEffect(() => {
    if (!user) return;
    const handleTodoCaptured = async (e: any) => {
      const capturedDate = e?.detail?.date;
      if (capturedDate === selectedDate) {
        try {
          const dailyResult = await getDailyPage(user.id, selectedDate);
          setPageData(dailyResult.page);
          setTodos(dailyResult.todos);
          setSchedule(dailyResult.schedule);
        } catch (err) {
          console.error('Failed to reload todos after quick capture', err);
        }
      }
    };
    window.addEventListener('todo_captured', handleTodoCaptured);
    return () => window.removeEventListener('todo_captured', handleTodoCaptured);
  }, [user?.id, selectedDate]);

  // Date Navigation
  const handlePrevDay = () => {
    const current = parseISO(selectedDate);
    setSelectedDate(format(subDays(current, 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const current = parseISO(selectedDate);
    setSelectedDate(format(addDays(current, 1), 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  // Autosave Daily Page header fields (checks, priorities, goal)
  const updatePage = (updates: Partial<DailyPage>) => {
    if (!pageData || !user) return;
    const updated = { ...pageData, ...updates };
    setPageData(updated);
    triggerSave(() => saveDailyPage(user.id, updated));
  };

  // 4 Daily Checks toggle
  const toggleCheck = (checkKey: 'check1' | 'check2' | 'check3' | 'check4') => {
    if (!pageData) return;
    updatePage({ [checkKey]: !pageData[checkKey] });
  };

  // Priorities up to 5 lines
  const handlePriorityChange = (index: number, val: string) => {
    if (!pageData) return;
    const newPriorities = [...(pageData.priorities || ['', '', '', '', ''])];
    newPriorities[index] = val;
    updatePage({ priorities: newPriorities });
  };

  // To-Do list updates
  const handleTodoToggle = (id: string) => {
    const updated = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setTodos(updated);
    if (pageData) {
      triggerSave(() => saveDailyTodos(pageData.id, updated));
    }
  };

  const handleTodoTextChange = (id: string, text: string) => {
    const updated = todos.map((t) => (t.id === id ? { ...t, text } : t));
    setTodos(updated);
    if (pageData) {
      triggerSave(() => saveDailyTodos(pageData.id, updated));
    }
  };

  const handleAddTodoRow = () => {
    if (!pageData || !user) return;
    const newRow: DailyTodo = {
      id: crypto.randomUUID(),
      daily_page_id: pageData.id,
      user_id: user.id,
      text: '',
      done: false,
      sort_order: todos.length,
    };
    const updated = [...todos, newRow];
    setTodos(updated);
    setFocusTodoId(newRow.id);
    triggerSave(() => saveDailyTodos(pageData.id, updated));
  };

  // Carry forward unfinished to tomorrow
  const handleCarryForward = async () => {
    if (!user || !pageData) return;
    const unfinished = todos.filter((t) => !t.done && t.text.trim().length > 0);
    if (unfinished.length === 0) {
      setCarryNotification('No unfinished to-dos to carry forward.');
      setTimeout(() => setCarryNotification(null), 3000);
      return;
    }

    const tomorrow = format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
    const count = await carryForwardUnfinishedTodos(user.id, selectedDate, tomorrow, unfinished);
    setCarryNotification(`Carried forward ${count} unfinished item(s) to tomorrow.`);
    setTimeout(() => setCarryNotification(null), 4000);
  };

  // Roll past unfinished todos into today (Morning Standup Sweep)
  const handleRollPastTodos = async () => {
    if (!user || !standupSweepData || !pageData) return;
    const updated = await rollTodosIntoDate(user.id, selectedDate, standupSweepData.todos);
    setTodos(updated);
    setCarryNotification(`Swept ${standupSweepData.count} unfinished task(s) into today's diary.`);
    setStandupSweepData(null);
    setTimeout(() => setCarryNotification(null), 4000);
  };

  // Keyboard navigation & auto-spawning for To-Dos (Enter / Backspace / Arrows)
  const handleTodoKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!pageData || !user) return;
      const newRow: DailyTodo = {
        id: crypto.randomUUID(),
        daily_page_id: pageData.id,
        user_id: user.id,
        text: '',
        done: false,
        sort_order: index + 1,
      };
      const updated = [...todos];
      updated.splice(index + 1, 0, newRow);
      const reindexed = updated.map((t, i) => ({ ...t, sort_order: i }));
      setTodos(reindexed);
      triggerSave(() => saveDailyTodos(pageData.id, reindexed));
      setFocusTodoId(newRow.id);
    } else if (e.key === 'Backspace' && todos[index]?.text === '' && todos.length > 1) {
      e.preventDefault();
      const prevIdx = Math.max(0, index - 1);
      const prevTodoId = todos[prevIdx]?.id;
      const updated = todos.filter((_, i) => i !== index);
      const reindexed = updated.map((t, i) => ({ ...t, sort_order: i }));
      setTodos(reindexed);
      if (pageData) {
        triggerSave(() => saveDailyTodos(pageData.id, reindexed));
      }
      if (prevTodoId) {
        setFocusTodoId(prevTodoId);
      }
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      const prevTodo = todos[index - 1];
      if (prevTodo) todoInputMap.current.get(prevTodo.id)?.focus();
    } else if (e.key === 'ArrowDown' && index < todos.length - 1) {
      e.preventDefault();
      const nextTodo = todos[index + 1];
      if (nextTodo) todoInputMap.current.get(nextTodo.id)?.focus();
    }
  };

  // Keyboard navigation for Top 5 Priorities
  const handlePriorityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter' && index < 4) {
      e.preventDefault();
      priorityInputRefs.current[index + 1]?.focus();
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      priorityInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowDown' && index < 4) {
      e.preventDefault();
      priorityInputRefs.current[index + 1]?.focus();
    }
  };

  // Time-Blocking: 1-Click to-do to schedule slot
  const handleScheduleTodoToSlot = (todo: DailyTodo, timeSlot: string) => {
    if (!pageData) return;
    const updatedTodos = todos.map((t) =>
      t.id === todo.id ? { ...t, scheduled_slot: timeSlot } : t
    );
    setTodos(updatedTodos);

    const updatedSchedule = schedule.map((s) =>
      s.time_slot === timeSlot
        ? { ...s, activity: s.activity ? `${s.activity} • ${todo.text}` : todo.text }
        : s
    );
    setSchedule(updatedSchedule);

    triggerSave(async () => {
      await saveDailyTodos(pageData.id, updatedTodos);
      await saveDailySchedule(pageData.id, updatedSchedule);
    });

    setActiveSlotMenuTodoId(null);
    setCarryNotification(`Scheduled to ${timeSlot} focus slot.`);
    setTimeout(() => setCarryNotification(null), 3000);
  };

  const handleUnscheduleTodo = (todoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!pageData) return;
    const updatedTodos = todos.map((t) =>
      t.id === todoId ? { ...t, scheduled_slot: undefined } : t
    );
    setTodos(updatedTodos);
    triggerSave(() => saveDailyTodos(pageData.id, updatedTodos));
  };

  // Task Duration Cycling (15m, 30m, 45m, 1h, 2h, none)
  const cycleTodoDuration = (todoId: string) => {
    const DURATION_CYCLE: (number | undefined)[] = [undefined, 15, 30, 45, 60, 90, 120];
    const target = todos.find((t) => t.id === todoId);
    const currMinutes = target?.estimated_minutes;
    const currIdx = DURATION_CYCLE.indexOf(currMinutes);
    const nextIdx = (currIdx + 1) % DURATION_CYCLE.length;
    const nextMinutes = DURATION_CYCLE[nextIdx];

    const updated = todos.map((t) =>
      t.id === todoId ? { ...t, estimated_minutes: nextMinutes } : t
    );
    setTodos(updated);
    if (pageData) {
      triggerSave(() => saveDailyTodos(pageData.id, updated));
    }
  };

  // Strategic Category Cycling (Strategy -> Sales -> Systems -> Ops -> none)
  const cycleTodoCategory = (todoId: string) => {
    const target = todos.find((t) => t.id === todoId);
    const currCat = target?.category as any;
    const currIdx = CATEGORY_CYCLE.indexOf(currCat);
    const nextIdx = (currIdx + 1) % CATEGORY_CYCLE.length;
    const nextCat = CATEGORY_CYCLE[nextIdx];

    const updated = todos.map((t) =>
      t.id === todoId ? { ...t, category: nextCat } : t
    );
    setTodos(updated);
    if (pageData) {
      triggerSave(() => saveDailyTodos(pageData.id, updated));
    }
  };

  // 1-Click Sync to Monthly Review Time Audit register
  const handleSyncToMonthlyAudit = async () => {
    if (!user || !pageData || syncingAudit) return;
    setSyncingAudit(true);
    try {
      const slots: [boolean, boolean, boolean, boolean] = [
        Boolean(pageData.check1),
        Boolean(pageData.check2),
        Boolean(pageData.check3),
        Boolean(pageData.check4)
      ];
      await syncDailyTicksToMonthlyAudit(user.id, selectedDate, slots);
      const activeCount = slots.filter(Boolean).length;
      setCarryNotification(`Synced ${activeCount}/4 daily focus checks to your Monthly Review Time Audit register.`);
      setTimeout(() => setCarryNotification(null), 3500);
    } catch (err) {
      console.error('Failed to sync time audit', err);
    } finally {
      setSyncingAudit(false);
    }
  };

  // Time Budget Calculation
  const totalPlannedMinutes = todos
    .filter((t) => t.estimated_minutes && t.text.trim().length > 0)
    .reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);

  const completedMinutes = todos
    .filter((t) => t.done && t.estimated_minutes && t.text.trim().length > 0)
    .reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);

  const remainingMinutes = Math.max(0, totalPlannedMinutes - completedMinutes);

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  // Schedule activity updates
  const handleScheduleChange = (id: string, activity: string) => {
    const updated = schedule.map((s) => (s.id === id ? { ...s, activity } : s));
    setSchedule(updated);
    if (pageData) {
      triggerSave(() => saveDailySchedule(pageData.id, updated));
    }
  };

  // Daily checks labels
  const checkLabels = profile?.daily_checks_labels || [
    'Prayer / Meditation',
    'Mind fitness',
    'Physical fitness',
    'Family time'
  ];

  const formattedDateTitle = (() => {
    try {
      return format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy');
    } catch {
      return selectedDate;
    }
  })();

  return (
    <DiaryPageFrame title="Daily planner" subtitle={formattedDateTitle}>
      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-3 border-diary-gold border-t-diary-navy rounded-full animate-spin mb-3" />
          <p className="font-heading text-card-title text-diary-navy">Loading planner...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TOP CONTROLS CARD: DATE PICKER & 4 DAILY CHECKS */}
          <div className="diary-card p-4 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Date Selector Navigation */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrevDay}
                className="w-11 h-11 min-w-[44px] min-h-[44px] shrink-0 rounded-lg border border-diary-navy/20 bg-white hover:bg-diary-cream-light text-diary-navy flex items-center justify-center transition-colors"
                title="Previous day"
                aria-label="Previous day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 bg-diary-cream-light/70 px-3 py-2 rounded-lg border border-diary-navy/20 min-h-[44px] min-w-0">
                <CalendarIcon className="w-4 h-4 text-diary-navy shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="font-heading font-semibold text-diary-navy text-caption sm:text-body-medium focus:outline-none bg-transparent cursor-pointer min-w-0"
                />
              </div>

              <button
                type="button"
                onClick={handleNextDay}
                className="w-11 h-11 min-w-[44px] min-h-[44px] shrink-0 rounded-lg border border-diary-navy/20 bg-white hover:bg-diary-cream-light text-diary-navy flex items-center justify-center transition-colors"
                title="Next day"
                aria-label="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleToday}
                className="px-3.5 py-2 bg-diary-navy hover:bg-diary-navy-dark text-white font-heading font-semibold text-caption rounded-lg transition-colors min-h-[44px] shrink-0 shadow-xs active:scale-95"
              >
                Today
              </button>
            </div>

            {/* 4 Small Daily Checks & Sync Time Audit Button */}
            <div className="flex flex-col gap-2.5 w-full lg:w-auto">
              <div className="flex items-center justify-between gap-2">
                <span className="text-tag font-semibold uppercase text-diary-navy/70 tracking-wider">
                  Daily checks:
                </span>
                {/* Sync to Monthly Review Time Audit */}
                <button
                  type="button"
                  onClick={handleSyncToMonthlyAudit}
                  disabled={syncingAudit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-bold bg-diary-gold/25 hover:bg-diary-gold/35 text-diary-navy border border-diary-gold/40 transition-all min-h-[36px] shadow-2xs shrink-0 active:scale-95"
                  title="1-Click sync today's checks to your Monthly Review Time Audit register"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-diary-navy ${syncingAudit ? 'animate-spin' : ''}`} />
                  <span>Sync audit</span>
                </button>
              </div>

              <div className="grid grid-cols-2 grid-rows-2 sm:grid-rows-none sm:flex sm:flex-wrap items-center gap-2 sm:gap-3">
                {(['check1', 'check2', 'check3', 'check4'] as const).map((chkKey, i) => {
                  const isChecked = Boolean(pageData?.[chkKey]);
                  return (
                    <button
                      key={chkKey}
                      type="button"
                      onClick={() => toggleCheck(chkKey)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-caption sm:text-body-medium transition-all h-[56px] min-h-[56px] max-h-[56px] sm:h-auto sm:min-h-[44px] sm:max-h-none ${
                        isChecked
                          ? 'bg-diary-navy text-white font-medium shadow-xs border border-diary-navy'
                          : 'bg-diary-cream-light/60 hover:bg-diary-cream text-diary-navy border border-diary-navy/20'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-diary-gold shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-diary-navy/40 shrink-0" />
                      )}
                      <span className="leading-tight text-left line-clamp-2">
                        {checkLabels[i] || `Check ${i + 1}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CARRY FORWARD NOTIFICATION BANNER */}
          {carryNotification && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-body-default rounded-xl flex items-center gap-2.5 animate-in fade-in duration-200">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{carryNotification}</span>
            </div>
          )}

          {/* PRIORITIES & GOAL FOR THE DAY GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* PRIORITIES BLOCK (Up to 5 lines, sentence case) */}
            <div className="lg:col-span-7 diary-card p-4 md:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-diary-navy/10">
                  <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                    Priorities
                  </h2>
                  <span className="text-caption text-diary-navy/60 font-medium">
                    Top 5 strategic focus items
                  </span>
                </div>

                <div className="space-y-2.5">
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const val = pageData?.priorities?.[idx] || '';
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 bg-diary-cream-light/50 hover:bg-diary-cream-light/80 rounded-lg border border-diary-navy/15 transition-colors"
                      >
                        <span className="w-6 h-6 rounded-full bg-diary-navy text-diary-gold font-heading font-bold text-caption flex items-center justify-center shrink-0 shadow-xs">
                          {idx + 1}
                        </span>
                        <input
                          ref={(el) => {
                            priorityInputRefs.current[idx] = el;
                          }}
                          type="text"
                          value={val}
                          onKeyDown={(e) => handlePriorityKeyDown(e, idx)}
                          onChange={(e) => handlePriorityChange(idx, e.target.value)}
                          placeholder={`Priority #${idx + 1}...`}
                          className="flex-1 min-w-0 bg-transparent text-body-default text-diary-text focus:outline-none px-1"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-diary-navy/10 text-caption text-diary-navy/60">
                Focus on the 20% of efforts that yield 80% of executive results.
              </div>
            </div>

            {/* GOAL FOR THE DAY (Large text box + lightbulb graphic) */}
            <div className="lg:col-span-5 diary-card p-4 md:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-diary-navy/10">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-diary-gold fill-diary-gold/40" />
                    <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                      Goal for the day
                    </h2>
                  </div>
                  {goalsList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowGoalSuggestions(!showGoalSuggestions)}
                      className="text-caption font-semibold text-diary-navy hover:text-diary-navy-dark flex items-center gap-1.5 bg-diary-cream-light px-3 py-2 rounded-lg border border-diary-navy/20 transition-colors min-h-[44px] whitespace-nowrap shrink-0 shadow-2xs"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-diary-navy/70" />
                      <span>Link goal</span>
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showGoalSuggestions && goalsList.length > 0 && (
                  <div className="mb-3 p-2.5 bg-diary-cream-light rounded-xl border border-diary-navy/20 text-caption space-y-1 shadow-md">
                    <div className="font-bold text-diary-navy text-tag uppercase mb-1">
                      Select a goal from your tracker:
                    </div>
                    {goalsList.slice(0, 4).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          updatePage({ goal_for_day: g.goal, linked_goal_id: g.id });
                          setShowGoalSuggestions(false);
                        }}
                        className="w-full text-left p-1.5 rounded hover:bg-white text-diary-navy font-medium truncate block"
                      >
                        • {g.goal}
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  rows={5}
                  value={pageData?.goal_for_day || ''}
                  onChange={(e) => updatePage({ goal_for_day: e.target.value })}
                  placeholder="What is the single most vital victory that defines success for today?"
                  className="w-full p-3 rounded-lg bg-diary-cream-light/30 border border-diary-navy/20 text-body-default text-diary-text focus:outline-none focus:ring-1 focus:ring-diary-navy focus:bg-white resize-none"
                />
              </div>

              <div className="mt-3 text-caption text-diary-navy/60 italic">
                Small daily disciplines repeated with consistency produce transformative results.
              </div>
            </div>
          </div>

          {/* MOBILE PLANNER SEGMENT SWITCHER (<lg only) */}
          <div className="lg:hidden flex items-center p-1 bg-diary-cream-light rounded-xl border border-diary-navy/15 mb-4 text-caption font-semibold">
            <button
              type="button"
              onClick={() => setMobilePlannerView('both')}
              className={`flex-1 py-2 rounded-lg text-center transition-all ${
                mobilePlannerView === 'both' ? 'bg-diary-navy text-white font-bold shadow-xs' : 'text-diary-navy/70'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setMobilePlannerView('todos')}
              className={`flex-1 py-2 rounded-lg text-center transition-all ${
                mobilePlannerView === 'todos' ? 'bg-diary-navy text-white font-bold shadow-xs' : 'text-diary-navy/70'
              }`}
            >
              To-dos ({todos.length})
            </button>
            <button
              type="button"
              onClick={() => setMobilePlannerView('schedule')}
              className={`flex-1 py-2 rounded-lg text-center transition-all ${
                mobilePlannerView === 'schedule' ? 'bg-diary-navy text-white font-bold shadow-xs' : 'text-diary-navy/70'
              }`}
            >
              Schedule
            </button>
          </div>

          {/* TO DO LIST & TIME SCHEDULE SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TO DO LIST (Clean checkboxes, carry forward button, add row) */}
            <div className={`diary-card p-4 md:p-6 flex flex-col justify-between ${
              mobilePlannerView === 'schedule' ? 'hidden lg:flex' : 'flex'
            }`}>
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-diary-navy/10">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-diary-navy" />
                    <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                      To-do list
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleCarryForward}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-diary-cream hover:bg-diary-cream-dark text-diary-navy font-semibold text-caption rounded-lg transition-colors border border-diary-navy/20 min-h-[38px] sm:min-h-[44px] shadow-2xs"
                    title="Carry forward unfinished to-dos to tomorrow"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-diary-navy" />
                    <span>Carry forward</span>
                  </button>
                </div>

                {/* MORNING STANDUP SWEEP BANNER */}
                {standupSweepData && (
                  <div className="mb-4 p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in-50 duration-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4 text-amber-700" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-caption font-bold text-amber-950">
                          Morning Standup Sweep
                        </div>
                        <div className="text-caption text-amber-800 truncate">
                          {standupSweepData.count} unfinished task(s) from {standupSweepData.sourceDate}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleRollPastTodos}
                        className="px-3 py-1.5 bg-diary-navy hover:bg-diary-navy-dark text-white text-caption font-bold rounded-lg shadow-xs transition-all active:scale-95 min-h-[36px]"
                      >
                        Roll into today
                      </button>
                      <button
                        type="button"
                        onClick={() => setStandupSweepData(null)}
                        className="p-1 text-amber-800/70 hover:text-amber-950 min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* EXECUTIVE TIME BUDGET BAR */}
                {totalPlannedMinutes > 0 && (
                  <div className="mb-3 px-3 py-1.5 bg-diary-cream-light/80 border border-diary-navy/15 rounded-lg flex flex-wrap items-center justify-between gap-2 text-caption">
                    <div className="flex items-center gap-2 font-medium text-diary-navy">
                      <Clock className="w-3.5 h-3.5 text-diary-gold-dark" />
                      <span>Planned: <strong>{formatHours(totalPlannedMinutes)}</strong></span>
                      <span className="text-diary-navy/30">•</span>
                      <span>Done: <strong>{formatHours(completedMinutes)}</strong></span>
                      <span className="text-diary-navy/30">•</span>
                      <span>Left: <strong className="text-diary-navy">{formatHours(remainingMinutes)}</strong></span>
                    </div>
                    {totalPlannedMinutes > 480 && (
                      <span className="text-tag font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                        ⚠️ High workload ({formatHours(totalPlannedMinutes)})
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                  {todos.map((todo, idx) => (
                    <div
                      key={todo.id}
                      className={`group relative flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 p-2 rounded-lg border transition-all ${
                        activeSlotMenuTodoId === todo.id ? 'z-30' : 'z-0'
                      } ${
                        todo.done
                          ? 'bg-diary-cream-row/70 border-diary-navy/10 opacity-75'
                          : 'bg-white border-diary-navy/15 hover:border-diary-navy/35 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleTodoToggle(todo.id)}
                          className="shrink-0 p-1.5 text-diary-navy hover:text-diary-navy-dark min-w-[36px] min-h-[36px] flex items-center justify-center transition-transform active:scale-90"
                          aria-label="Toggle to-do done"
                        >
                          {todo.done ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                          ) : (
                            <Square className="w-4 h-4 text-diary-navy/40 group-hover:text-diary-navy/70" />
                          )}
                        </button>

                        <input
                          ref={(el) => {
                            if (el) todoInputMap.current.set(todo.id, el);
                            else todoInputMap.current.delete(todo.id);
                          }}
                          autoFocus={focusTodoId === todo.id}
                          type="text"
                          value={todo.text}
                          onKeyDown={(e) => handleTodoKeyDown(e, idx)}
                          onChange={(e) => handleTodoTextChange(todo.id, e.target.value)}
                          placeholder={`To-do #${idx + 1}...`}
                          className={`flex-1 min-w-0 bg-transparent text-body-default focus:outline-none ${
                            todo.done
                              ? 'line-through text-diary-navy/45'
                              : 'text-diary-text font-normal'
                          }`}
                        />
                      </div>

                      {/* Right-side quick controls: Category tag, Duration pill & Time-Block slot */}
                      <div className="flex items-center justify-end gap-1.5 pl-9 sm:pl-0 shrink-0">
                        {/* Strategic Category Pill (Click to cycle: Strategy -> Sales -> Systems -> Ops -> none) */}
                        <button
                          type="button"
                          onClick={() => cycleTodoCategory(todo.id)}
                          className={`text-tag font-bold px-2 py-1 rounded border transition-all min-h-[32px] flex items-center justify-center ${
                            todo.category && CATEGORY_MAP[todo.category]
                              ? `${CATEGORY_MAP[todo.category].badge} shadow-2xs`
                              : 'text-diary-navy/60 hover:text-diary-navy hover:bg-diary-cream-light border-diary-navy/15 opacity-80 sm:opacity-0 sm:group-hover:opacity-100'
                          }`}
                          title="Click to cycle strategic category (Strategy, Sales, Systems, Ops)"
                        >
                          {todo.category && CATEGORY_MAP[todo.category] ? (
                            <span>{CATEGORY_MAP[todo.category].label}</span>
                          ) : (
                            <span className="flex items-center gap-0.5">
                              <Tag className="w-2.5 h-2.5" />
                              <span>Tag</span>
                            </span>
                          )}
                        </button>

                        {/* Duration Pill (Click to cycle: 15m -> 30m -> 45m -> 1h -> 2h -> none) */}
                        <button
                          type="button"
                          onClick={() => cycleTodoDuration(todo.id)}
                          className={`text-tag font-semibold px-2 py-1 rounded transition-colors min-h-[32px] flex items-center justify-center ${
                            todo.estimated_minutes
                              ? 'bg-diary-gold/25 text-diary-navy font-bold border border-diary-gold/40'
                              : 'text-diary-navy/60 hover:text-diary-navy hover:bg-diary-cream-light opacity-80 sm:opacity-0 sm:group-hover:opacity-100'
                          }`}
                          title="Click to cycle estimated duration (15m, 30m, 45m, 1h, 2h)"
                        >
                          {todo.estimated_minutes ? `${todo.estimated_minutes}m` : '+Est'}
                        </button>

                        {/* Time-blocking slot button & popup */}
                        <div className="relative">
                          {todo.scheduled_slot ? (
                            <div className="flex items-center gap-1 bg-diary-navy text-white text-tag font-bold px-2 py-1 rounded shadow-xs min-h-[32px]">
                              <span>{todo.scheduled_slot}</span>
                              <button
                                type="button"
                                onClick={(e) => handleUnscheduleTodo(todo.id, e)}
                                className="hover:text-diary-gold ml-0.5 text-white/70"
                                title="Unschedule"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveSlotMenuTodoId(activeSlotMenuTodoId === todo.id ? null : todo.id)}
                              className="p-1.5 rounded text-diary-navy/60 hover:text-diary-navy hover:bg-diary-cream-light transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
                              title="Time-block this task into an hourly schedule slot"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          )}

                          {activeSlotMenuTodoId === todo.id && (
                            <div className="absolute right-0 top-7 w-48 bg-white rounded-xl shadow-xl border border-diary-navy/20 p-2 z-50 animate-in fade-in-50 duration-150">
                              <div className="text-tag font-bold uppercase text-diary-navy/70 pb-1 mb-1 border-b border-diary-navy/10 flex items-center justify-between">
                                <span>Assign to slot:</span>
                                <button
                                  type="button"
                                  onClick={() => setActiveSlotMenuTodoId(null)}
                                  className="text-diary-navy/60 hover:text-diary-navy"
                                >
                                  ×
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                                {DEFAULT_TIME_SLOTS.map((slot) => (
                                  <button
                                    key={slot}
                                    type="button"
                                    onClick={() => handleScheduleTodoToSlot(todo, slot)}
                                    className="text-caption text-left px-2 py-1 rounded hover:bg-diary-cream-light text-diary-navy font-semibold transition-colors"
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddTodoRow}
                className="mt-4 w-full py-2.5 border border-dashed border-diary-navy/30 rounded-lg text-body-medium font-semibold text-diary-navy hover:bg-diary-cream-light flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
              >
                <Plus className="w-4 h-4 text-diary-navy" />
                <span>Add to-do row (or press Enter)</span>
              </button>
            </div>

            {/* TIME / ACTIVITY SCHEDULE (6 AM to 9 PM, cream headers) */}
            <div className={`diary-card p-4 md:p-6 flex flex-col justify-between ${
              mobilePlannerView === 'todos' ? 'hidden lg:flex' : 'flex'
            }`}>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-diary-navy/10">
                  <h2 className="font-heading text-card-title text-diary-navy font-semibold truncate">
                    Time & activity schedule
                  </h2>
                  <span className="shrink-0 text-tag font-semibold uppercase text-diary-navy bg-diary-gold/25 px-2.5 py-0.5 rounded border border-diary-gold/40">
                    Mind fitness
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[540px] overflow-y-auto rounded-lg border border-diary-navy/20">
                  <table className="diary-table">
                    <thead>
                      <tr>
                        <th className="w-28 text-left">Time slot</th>
                        <th className="text-left">Activity / focus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((item) => {
                        const isTimeBlocked = todos.some(
                          (t) => t.scheduled_slot === item.time_slot
                        );
                        return (
                          <tr key={item.id} className={isTimeBlocked ? 'bg-diary-gold/10' : undefined}>
                            <td className="font-heading font-semibold text-diary-navy whitespace-nowrap text-caption">
                              <div className="flex items-center gap-1.5">
                                <span>{item.time_slot}</span>
                                {isTimeBlocked && (
                                  <span className="text-[10px] uppercase font-bold text-diary-navy bg-diary-gold/30 px-1 py-0.2 rounded" title="Time-blocked from To-Do list">
                                    Blocked
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.activity}
                                onChange={(e) => handleScheduleChange(item.id, e.target.value)}
                                placeholder="Activity / focus..."
                                className="w-full bg-transparent focus:outline-none text-body-default text-diary-text px-1"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-diary-navy/10 text-caption text-diary-navy/60">
                Hourly focus blocks ensure disciplined execution across the business day.
              </div>
            </div>
          </div>
        </div>
      )}
    </DiaryPageFrame>
  );
};
