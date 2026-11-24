import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, parseISO } from 'date-fns';
import {
  CalendarDays,
  Target,
  Sparkles,
  Clock,
  Briefcase,
  Megaphone,
  ArrowRight,
  TrendingUp,
  Plus,
  Check
} from 'lucide-react';
import { DiaryPageFrame } from '../components/layout/DiaryPageFrame';
import { useAuth } from '../context/AuthContext';
import { useAutosave } from '../context/AutosaveContext';
import {
  getDailyPage,
  saveDailyPage,
  saveDailyTodos,
  getMonthlyReview,
  saveMonthlyReview,
  getGoals,
  getSmartGoals,
  getPromotionPlans,
  getManagementItems
} from '../lib/dataService';
import {
  DailyPage,
  DailyTodo,
  MonthlyReview,
  Goal,
  SmartGoal,
  PromotionPlanItem,
  ManagementItem
} from '../types/database';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { triggerSave } = useAutosave();
  const navigate = useNavigate();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const now = new Date();
  const [loading, setLoading] = useState<boolean>(true);

  const [dailyPage, setDailyPage] = useState<DailyPage | null>(null);
  const [todayTodos, setTodayTodos] = useState<DailyTodo[]>([]);
  const [monthlyReview, setMonthlyReview] = useState<MonthlyReview | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [smartGoals, setSmartGoals] = useState<SmartGoal[]>([]);
  const [promoItems, setPromoItems] = useState<PromotionPlanItem[]>([]);
  const [openChallenges, setOpenChallenges] = useState<ManagementItem[]>([]);

  // Quick Add state
  const [quickAddTab, setQuickAddTab] = useState<'todo' | 'priority' | 'tick'>('todo');
  const [quickInput, setQuickInput] = useState('');
  const [quickAddSuccess, setQuickAddSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    async function loadDashboard() {
      setLoading(true);
      try {
        const [
          dailyRes,
          monthlyRes,
          goalsRes,
          smartRes,
          promoRes,
          sysItems,
          srvItems,
          salesItems
        ] = await Promise.all([
          getDailyPage(user!.id, todayStr),
          getMonthlyReview(user!.id, now.getFullYear(), now.getMonth() + 1),
          getGoals(user!.id),
          getSmartGoals(user!.id),
          getPromotionPlans(user!.id),
          getManagementItems(user!.id, 'system'),
          getManagementItems(user!.id, 'service'),
          getManagementItems(user!.id, 'sales'),
        ]);

        if (!isCancelled) {
          setDailyPage(dailyRes.page);
          setTodayTodos(dailyRes.todos);
          setMonthlyReview(monthlyRes);
          setGoals(goalsRes);
          setSmartGoals(smartRes.smartGoals);

          const allPromoItems: PromotionPlanItem[] = [];
          Object.values(promoRes.items).forEach((items) => {
            allPromoItems.push(...items);
          });
          setPromoItems(allPromoItems);

          const allMgmt = [...sysItems, ...srvItems, ...salesItems];
          setOpenChallenges(
            allMgmt.filter((m) => m.status === 'Open' && m.challenge.trim().length > 0)
          );
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  // Goals calculations
  const totalGoals = goals.length;
  const doneGoals = goals.filter((g) => g.status === 2).length;
  const goalPercent = totalGoals > 0 ? Math.round((doneGoals / totalGoals) * 100) : 0;

  // SMART Goals nearing deadline (<= 7 days or overdue)
  const nearingSmartGoals = smartGoals.filter((g) => {
    if (!g.completion_date) return false;
    const days = differenceInDays(parseISO(g.completion_date), new Date());
    return days <= 7;
  });

  // Overdue promo items
  const overduePromoItems = promoItems.filter((item) => {
    if (!item.deadline || !item.plan_of_action.trim()) return false;
    const days = differenceInDays(parseISO(item.deadline), new Date());
    return days < 0;
  });

  // Today to-dos completed
  const activeTodos = todayTodos.filter((t) => t.text.trim().length > 0);
  const doneTodos = activeTodos.filter((t) => t.done).length;
  const todoCompletionPct =
    activeTodos.length > 0 ? Math.round((doneTodos / activeTodos.length) * 100) : 0;

  // Time audit total ticks
  const totalTicks = React.useMemo(() => {
    if (!monthlyReview?.time_audit) return 0;
    let count = 0;
    Object.values(monthlyReview.time_audit).forEach((arr) => {
      if (Array.isArray(arr)) {
        arr.forEach((v) => {
          if (v) count++;
        });
      }
    });
    return count;
  }, [monthlyReview?.time_audit]);

  // Handle Quick Add Action
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dailyPage) return;

    if (quickAddTab === 'todo') {
      if (!quickInput.trim()) return;
      const newTodo: DailyTodo = {
        id: crypto.randomUUID(),
        daily_page_id: dailyPage.id,
        user_id: user.id,
        text: quickInput.trim(),
        done: false,
        sort_order: todayTodos.length,
      };
      const updated = [...todayTodos, newTodo];
      setTodayTodos(updated);
      setQuickInput('');
      setQuickAddSuccess(true);
      triggerSave(() => saveDailyTodos(dailyPage.id, updated));
      setTimeout(() => setQuickAddSuccess(false), 2000);
    } else if (quickAddTab === 'priority') {
      if (!quickInput.trim()) return;
      const priorities = [...(dailyPage.priorities || ['', '', '', '', ''])];
      const emptyIdx = priorities.findIndex((p) => !p.trim());
      if (emptyIdx >= 0) {
        priorities[emptyIdx] = quickInput.trim();
      } else {
        priorities[0] = quickInput.trim();
      }
      const updatedPage = { ...dailyPage, priorities };
      setDailyPage(updatedPage);
      setQuickInput('');
      setQuickAddSuccess(true);
      triggerSave(() => saveDailyPage(user.id, updatedPage));
      setTimeout(() => setQuickAddSuccess(false), 2000);
    } else if (quickAddTab === 'tick') {
      if (!monthlyReview) return;
      const dayStr = String(now.getDate());
      const daySlots = [...(monthlyReview.time_audit?.[dayStr] || [false, false, false, false])];
      const emptySlotIdx = daySlots.findIndex((s) => !s);
      if (emptySlotIdx >= 0) {
        daySlots[emptySlotIdx] = true;
      } else {
        daySlots[0] = true;
      }
      const updatedAudit = { ...monthlyReview.time_audit, [dayStr]: daySlots };
      const updatedReview = { ...monthlyReview, time_audit: updatedAudit };
      setMonthlyReview(updatedReview);
      setQuickAddSuccess(true);
      triggerSave(() => saveMonthlyReview(user.id, updatedReview));
      setTimeout(() => setQuickAddSuccess(false), 2000);
    }
  };

  return (
    <DiaryPageFrame title="Dashboard">
      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-3 border-diary-gold border-t-diary-navy rounded-full animate-spin mb-3" />
          <p className="font-heading text-card-title text-diary-navy">Loading dashboard...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ROW 1: TODAY CARD (2/3) + QUICK ADD CARD (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* TODAY CARD (2/3 width) */}
            <div className="lg:col-span-8 diary-card p-4 md:p-6 flex flex-col justify-between">
              <div>
                {/* Header row: Date and Tag */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-tag font-semibold uppercase text-diary-navy/70 tracking-wider">
                      Today's focus
                    </span>
                    <span className="text-diary-navy/30">•</span>
                    <span className="text-caption text-diary-navy/70 font-medium">
                      {format(new Date(), 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                  <span className="text-tag font-bold text-diary-navy bg-diary-gold/25 px-2.5 py-0.5 rounded border border-diary-gold/40">
                    1% Improvement → leads to → No 1
                  </span>
                </div>

                {/* Focus Goal Quote */}
                <div className="mb-4">
                  <h2 className="font-heading text-section-title text-diary-navy leading-snug font-bold">
                    {dailyPage?.goal_for_day ? (
                      `"${dailyPage.goal_for_day}"`
                    ) : (
                      <span className="text-diary-navy/40 font-normal italic">
                        No primary goal set for today.
                      </span>
                    )}
                  </h2>
                </div>

                {/* Top 3 Priorities */}
                <div className="space-y-2 mt-4 pt-4 border-t border-diary-navy/10">
                  <div className="text-tag uppercase text-diary-navy/70 font-bold tracking-wider">
                    Top priorities
                  </div>
                  {(dailyPage?.priorities || []).filter(Boolean).length === 0 ? (
                    <p className="text-caption text-diary-navy/50 italic">
                      No priorities logged for today yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {dailyPage?.priorities
                        .filter(Boolean)
                        .slice(0, 3)
                        .map((pri, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2.5 text-body-default text-diary-text p-1.5 rounded-lg bg-diary-cream-light/40 border border-diary-navy/10"
                          >
                            <span className="w-5 h-5 rounded-full bg-diary-navy text-diary-gold font-heading font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {i + 1}
                            </span>
                            <span className="truncate font-medium">{pri}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Ring Footer */}
              <div className="mt-5 pt-4 border-t border-diary-navy/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* SVG Progress Ring */}
                  <div className="relative w-10 h-10 shrink-0">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        className="stroke-diary-cream-dark"
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        className="stroke-diary-gold transition-all duration-500"
                        strokeWidth="3.5"
                        strokeDasharray={88}
                        strokeDashoffset={88 - (88 * todoCompletionPct) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-heading font-bold text-diary-navy">
                      {todoCompletionPct}%
                    </span>
                  </div>
                  <div>
                    <div className="text-body-medium font-semibold text-diary-navy leading-none">
                      {doneTodos} of {activeTodos.length} to-dos completed
                    </div>
                    <div className="text-caption text-diary-navy/60 mt-0.5">
                      Keep up your daily momentum
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/daily')}
                  className="text-caption font-bold text-diary-navy hover:text-diary-navy-dark flex items-center gap-1 transition-colors min-h-[44px] px-3 py-1.5 rounded-lg bg-diary-cream-light border border-diary-navy/20 hover:bg-diary-cream"
                >
                  <span>Open planner</span>
                  <ArrowRight className="w-3.5 h-3.5 text-diary-navy" />
                </button>
              </div>
            </div>

            {/* QUICK ADD CARD (1/3 width) */}
            <div className="lg:col-span-4 diary-card p-4 md:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading text-card-title text-diary-navy font-semibold">
                    Quick add
                  </h3>
                  {quickAddSuccess && (
                    <span className="text-tag text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Added
                    </span>
                  )}
                </div>

                {/* Sub-tabs */}
                <div className="grid grid-cols-3 gap-1 bg-diary-cream-light p-1 rounded-lg mb-4 text-caption font-semibold border border-diary-navy/15">
                  <button
                    type="button"
                    onClick={() => setQuickAddTab('todo')}
                    className={`py-1.5 px-1 rounded-md text-xs sm:text-caption whitespace-nowrap flex items-center justify-center transition-all ${
                      quickAddTab === 'todo'
                        ? 'bg-diary-navy text-white font-bold shadow-xs'
                        : 'text-diary-navy/70 hover:text-diary-navy'
                    }`}
                  >
                    To-do
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAddTab('priority')}
                    className={`py-1.5 px-1 rounded-md text-xs sm:text-caption whitespace-nowrap flex items-center justify-center transition-all ${
                      quickAddTab === 'priority'
                        ? 'bg-diary-navy text-white font-bold shadow-xs'
                        : 'text-diary-navy/70 hover:text-diary-navy'
                    }`}
                  >
                    Priority
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAddTab('tick')}
                    className={`py-1.5 px-1 rounded-md text-xs sm:text-caption whitespace-nowrap flex items-center justify-center transition-all ${
                      quickAddTab === 'tick'
                        ? 'bg-diary-navy text-white font-bold shadow-xs'
                        : 'text-diary-navy/70 hover:text-diary-navy'
                    }`}
                  >
                    Time tick
                  </button>
                </div>

                {/* Action Form */}
                <form onSubmit={handleQuickAddSubmit} className="space-y-3">
                  {quickAddTab === 'tick' ? (
                    <div className="p-3 bg-diary-cream-light/60 rounded-lg text-center space-y-2 border border-diary-navy/15">
                      <p className="text-caption text-diary-navy/80">
                        Log a focused execution slot for today in your monthly time audit register.
                      </p>
                      <button
                        type="submit"
                        className="w-full py-2 bg-diary-navy hover:bg-diary-navy-dark text-white rounded-lg text-body-medium font-semibold transition-colors shadow-xs active:scale-95"
                      >
                        + Log focus interval
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={quickInput}
                        onChange={(e) => setQuickInput(e.target.value)}
                        placeholder={
                          quickAddTab === 'todo'
                            ? 'New to-do item...'
                            : 'New priority focus...'
                        }
                        className="w-full p-2.5 bg-diary-cream-light/30 border border-diary-navy/20 rounded-lg text-body-default text-diary-text focus:outline-none focus:ring-1 focus:ring-diary-navy focus:bg-white"
                      />
                      <button
                        type="submit"
                        disabled={!quickInput.trim()}
                        className="w-full py-2 bg-diary-navy hover:bg-diary-navy-dark text-white rounded-lg text-body-medium font-semibold transition-colors shadow-xs disabled:opacity-40 active:scale-95"
                      >
                        Add {quickAddTab === 'todo' ? 'to-do' : 'priority'}
                      </button>
                    </>
                  )}
                </form>
              </div>

              <div className="mt-4 pt-3 border-t border-diary-navy/10 text-caption text-diary-navy/60">
                Quick entries save directly to today's active diary register.
              </div>
            </div>
          </div>

          {/* ROW 2: FOUR EQUAL KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1: Goals done */}
            <div
              onClick={() => navigate('/goals')}
              className="diary-card p-4 md:p-6 cursor-pointer hover:border-diary-navy/40 transition-colors"
            >
              <div className="flex items-center justify-between text-diary-navy/60 mb-2">
                <Target className="w-4 h-4 text-diary-navy" />
                <span className="text-caption text-diary-navy font-bold bg-diary-gold/25 px-2 py-0.5 rounded border border-diary-gold/30">
                  {doneGoals}/{totalGoals}
                </span>
              </div>
              <div className="text-[28px] font-heading font-bold text-diary-navy leading-none tabular-nums">
                {goalPercent}%
              </div>
              <div className="text-caption font-semibold text-diary-navy/70 mt-1">
                Goals completed
              </div>
            </div>

            {/* KPI 2: Time audit ticks */}
            <div
              onClick={() => navigate('/monthly')}
              className="diary-card p-4 md:p-6 cursor-pointer hover:border-diary-navy/40 transition-colors"
            >
              <div className="flex items-center justify-between text-diary-navy/60 mb-2">
                <Clock className="w-4 h-4 text-diary-navy" />
                <span className="text-caption text-diary-navy/80 font-semibold bg-diary-cream-light px-2 py-0.5 rounded border border-diary-navy/15">
                  This month
                </span>
              </div>
              <div className="text-[28px] font-heading font-bold text-diary-navy leading-none tabular-nums">
                {totalTicks}
              </div>
              <div className="text-caption font-semibold text-diary-navy/70 mt-1">
                Time audit ticks
              </div>
            </div>

            {/* KPI 3: Open challenges */}
            <div
              onClick={() => navigate('/management')}
              className="diary-card p-4 md:p-6 cursor-pointer hover:border-diary-navy/40 transition-colors"
            >
              <div className="flex items-center justify-between text-diary-navy/60 mb-2">
                <Briefcase className="w-4 h-4 text-diary-navy" />
                <span className="text-caption text-amber-900 font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                  Systems
                </span>
              </div>
              <div className="text-[28px] font-heading font-bold text-diary-navy leading-none tabular-nums">
                {openChallenges.length}
              </div>
              <div className="text-caption font-semibold text-diary-navy/70 mt-1">
                Open challenges
              </div>
            </div>

            {/* KPI 4: Overdue plans */}
            <div
              onClick={() => navigate('/promotion')}
              className="diary-card p-4 md:p-6 cursor-pointer hover:border-diary-navy/40 transition-colors"
            >
              <div className="flex items-center justify-between text-diary-navy/60 mb-2">
                <Megaphone className="w-4 h-4 text-diary-navy" />
                <span className="text-tag uppercase text-red-800 bg-red-100 px-2 py-0.5 rounded font-bold border border-red-200">
                  Action
                </span>
              </div>
              <div className="text-[28px] font-heading font-bold text-red-600 leading-none tabular-nums">
                {overduePromoItems.length}
              </div>
              <div className="text-caption font-semibold text-diary-navy/70 mt-1">
                Overdue plans
              </div>
            </div>
          </div>

          {/* ROW 3: TWO COLUMNS (SMART GOALS NEARING DEADLINE + PROMOTION DEADLINES) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* COLUMN 1: SMART GOALS NEARING DEADLINE */}
            <div className="diary-card p-4 md:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-diary-navy/10">
                  <h3 className="font-heading text-card-title text-diary-navy font-semibold">
                    SMART goals nearing deadline
                  </h3>
                  <button
                    type="button"
                    onClick={() => navigate('/smart-goals')}
                    className="text-caption font-bold text-diary-navy hover:text-diary-gold-dark transition-colors min-h-[44px] flex items-center"
                  >
                    View all →
                  </button>
                </div>

                {nearingSmartGoals.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-body-default text-diary-navy/70">
                      No goals due within the next 7 days.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/smart-goals')}
                      className="px-3.5 py-1.5 bg-diary-navy hover:bg-diary-navy-dark text-white rounded-lg text-caption font-semibold transition-colors shadow-xs"
                    >
                      Create a SMART goal
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nearingSmartGoals.map((g) => {
                      const days = differenceInDays(parseISO(g.completion_date), new Date());
                      return (
                        <div
                          key={g.id}
                          onClick={() => navigate('/smart-goals')}
                          className="p-3 bg-diary-cream-light/60 hover:bg-diary-cream-light rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors border border-diary-navy/15"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-body-medium font-semibold text-diary-navy truncate">
                              {g.goal}
                            </div>
                            <div className="text-caption text-diary-navy/70 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              <span>Target:</span>
                              <span className="font-semibold text-diary-navy whitespace-nowrap">{g.completion_date}</span>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 px-2.5 py-1 rounded text-tag font-bold whitespace-nowrap uppercase border ${
                              days < 0
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-diary-gold/20 text-diary-navy border-diary-gold/40'
                            }`}
                          >
                            {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: PROMOTION DEADLINES */}
            <div className="diary-card p-4 md:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-diary-navy/10">
                  <h3 className="font-heading text-card-title text-diary-navy font-semibold">
                    Promotion deadlines
                  </h3>
                  <button
                    type="button"
                    onClick={() => navigate('/promotion')}
                    className="text-caption font-bold text-diary-navy hover:text-diary-gold-dark transition-colors min-h-[44px] flex items-center"
                  >
                    View plans →
                  </button>
                </div>

                {overduePromoItems.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-body-default text-diary-navy/70">
                      All campaign action deadlines are on track.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/promotion')}
                      className="px-3.5 py-1.5 bg-diary-navy hover:bg-diary-navy-dark text-white rounded-lg text-caption font-semibold transition-colors shadow-xs"
                    >
                      View promotion plans
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {overduePromoItems.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => navigate('/promotion')}
                        className="p-3 bg-red-50/70 hover:bg-red-50 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors border border-red-200"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-body-medium font-semibold text-red-950 truncate">
                            {item.plan_of_action}
                          </div>
                          <div className="text-caption text-red-800/90 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            <span>
                              Responsible: {item.responsibility || 'Operations'}
                            </span>
                            <span className="text-red-300">•</span>
                            <span className="font-semibold text-red-900 whitespace-nowrap">
                              Due: {item.deadline}
                            </span>
                          </div>
                        </div>

                        <span className="shrink-0 px-2 py-0.5 rounded bg-red-100 text-red-800 text-tag font-bold uppercase whitespace-nowrap border border-red-200">
                          Overdue
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DiaryPageFrame>
  );
};
