import { supabase, isSupabaseConfigured } from './supabase';
import { format, parseISO, subDays } from 'date-fns';
import {
  Profile,
  DailyPage,
  DailyTodo,
  DailySchedule,
  MonthlyReview,
  Goal,
  SmartGoal,
  SmartGoalStep,
  SmartGoalMilestone,
  PromotionPlan,
  PromotionPlanItem,
  ManagementItem,
  ManagementType
} from '../types/database';
import { brandConfig } from '../config/brand.config';

export const DEFAULT_TIME_SLOTS = [
  '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
  'Noon', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM',
  '6 PM', '7 PM', '8 PM', '9 PM'
];

// Offline / LocalStorage partitioned helpers
function getLocal<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(`bizdiary_${key}`);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (err) {
    console.error(`Error reading ${key}`, err);
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`bizdiary_${key}`, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key}`, err);
  }
}

// Queue for offline sync
interface QueuedAction {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  payload: any;
  timestamp: number;
}

export function queueOfflineSync(action: Omit<QueuedAction, 'id' | 'timestamp'>) {
  const queue = getLocal<QueuedAction[]>('sync_queue', []);
  queue.push({
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  });
  setLocal('sync_queue', queue);
}

export function getOfflineQueueCount(): number {
  return getLocal<QueuedAction[]>('sync_queue', []).length;
}

/* ==============================================================================
 * 1. PROFILES & USER SETTINGS
 * ============================================================================== */
export async function getProfile(userId: string): Promise<Profile> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    if (data) return data;
  }

  // Local / Fallback store
  const profiles = getLocal<Record<string, Profile>>('profiles', {});
  if (!profiles[userId]) {
    const defaultProfile: Profile = {
      id: userId,
      name: 'Business Leader',
      business_name: 'Strategic Enterprise Ltd',
      daily_checks_labels: [...brandConfig.defaults.dailyCheckLabels],
      time_audit_labels: [...brandConfig.defaults.timeAuditSlotLabels],
      timezone: 'Asia/Kolkata',
      is_admin: false,
    };
    profiles[userId] = defaultProfile;
    setLocal('profiles', profiles);
  }
  return profiles[userId];
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const profiles = getLocal<Record<string, Profile>>('profiles', {});
  const current = profiles[userId] || (await getProfile(userId));
  const updated: Profile = { ...current, ...updates, updated_at: new Date().toISOString() };
  profiles[userId] = updated;
  setLocal('profiles', profiles);
  return updated;
}

/* ==============================================================================
 * 2. DAILY PLANNER (Page 1)
 * ============================================================================== */
export async function getDailyPage(userId: string, date: string): Promise<{
  page: DailyPage;
  todos: DailyTodo[];
  schedule: DailySchedule[];
}> {
  if (isSupabaseConfigured && supabase) {
    // 1. Fetch or initialize Daily Page
    let { data: page, error } = await supabase
      .from('daily_pages')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    if (error) throw error;

    if (!page) {
      const { data: newPage, error: createError } = await supabase
        .from('daily_pages')
        .insert({
          user_id: userId,
          date,
          priorities: ['', '', '', '', ''],
          check1: false,
          check2: false,
          check3: false,
          check4: false,
          goal_for_day: ''
        })
        .select()
        .single();
      if (createError) throw createError;
      page = newPage;
    }

    // 2. Fetch Todos
    const { data: todos, error: todoErr } = await supabase
      .from('daily_todos')
      .select('*')
      .eq('daily_page_id', page.id)
      .order('sort_order', { ascending: true });
    if (todoErr) throw todoErr;

    // 3. Fetch Schedule
    let { data: schedule, error: schedErr } = await supabase
      .from('daily_schedule')
      .select('*')
      .eq('daily_page_id', page.id)
      .order('created_at', { ascending: true });
    if (schedErr) throw schedErr;

    // If schedule rows don't exist yet, seed the default slots
    if (!schedule || schedule.length === 0) {
      const defaultSlots = DEFAULT_TIME_SLOTS.map((slot) => ({
        daily_page_id: page.id,
        user_id: userId,
        time_slot: slot,
        activity: ''
      }));
      const { data: createdSched, error: schedSeedErr } = await supabase
        .from('daily_schedule')
        .insert(defaultSlots)
        .select();
      if (!schedSeedErr && createdSched) {
        schedule = createdSched;
      }
    }

    return {
      page,
      todos: todos || [],
      schedule: schedule || []
    };
  }

  // Local / Offline partition
  const pagesKey = `daily_pages_${userId}`;
  const pages = getLocal<Record<string, DailyPage>>(pagesKey, {});
  
  if (!pages[date]) {
    const pageId = crypto.randomUUID();
    pages[date] = {
      id: pageId,
      user_id: userId,
      date,
      check1: false,
      check2: false,
      check3: false,
      check4: false,
      priorities: [
        'Review core strategic metric with leadership team',
        'Close enterprise partner agreement proposal',
        'Complete 45 min Mind Fitness strategic reading',
        '',
        ''
      ],
      goal_for_day: 'Drive 1% operational efficiency across primary service delivery pipeline'
    };
    setLocal(pagesKey, pages);

    // Initial 8 todos
    const todosKey = `daily_todos_${pageId}`;
    const initialTodos: DailyTodo[] = [
      { id: crypto.randomUUID(), daily_page_id: pageId, user_id: userId, text: 'Review morning metrics and KPIs', done: true, sort_order: 0 },
      { id: crypto.randomUUID(), daily_page_id: pageId, user_id: userId, text: 'Strategy stand-up meeting with team', done: true, sort_order: 1 },
      { id: crypto.randomUUID(), daily_page_id: pageId, user_id: userId, text: 'Deep work: Q4 Promotion plan review', done: false, sort_order: 2 },
      { id: crypto.randomUUID(), daily_page_id: pageId, user_id: userId, text: 'Follow up on key client deliverables', done: false, sort_order: 3 },
      { id: crypto.randomUUID(), daily_page_id: pageId, user_id: userId, text: 'Audit service management system bottleneck', done: false, sort_order: 4 },
      { id: crypto.randomUUID(), daily_page_id: pageId, user_id: userId, text: 'Financial check & cashflow review', done: false, sort_order: 5 },
      { id: crypto.randomUUID(), daily_page_id: pageId, user_id: userId, text: '', done: false, sort_order: 6 },
      { id: crypto.randomUUID(), daily_page_id: pageId, user_id: userId, text: '', done: false, sort_order: 7 },
    ];
    setLocal(todosKey, initialTodos);

    // Initial schedule slots (6am to 9pm)
    const schedKey = `daily_schedule_${pageId}`;
    const initialSchedule: DailySchedule[] = DEFAULT_TIME_SLOTS.map((slot) => ({
      id: crypto.randomUUID(),
      daily_page_id: pageId,
      user_id: userId,
      time_slot: slot,
      activity: slot === '6 AM' ? 'Mind Fitness & Strategy Reading' : slot === '9 AM' ? 'Team Executive Standup' : ''
    }));
    setLocal(schedKey, initialSchedule);
  }

  const page = pages[date];
  const todos = getLocal<DailyTodo[]>(`daily_todos_${page.id}`, []);
  const schedule = getLocal<DailySchedule[]>(`daily_schedule_${page.id}`, []);

  return { page, todos, schedule };
}

export async function saveDailyPage(userId: string, page: DailyPage): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('daily_pages')
      .upsert({ ...page, user_id: userId, updated_at: new Date().toISOString() });
    if (error) throw error;
    return;
  }

  const pagesKey = `daily_pages_${userId}`;
  const pages = getLocal<Record<string, DailyPage>>(pagesKey, {});
  pages[page.date] = { ...page, updated_at: new Date().toISOString() };
  setLocal(pagesKey, pages);
}

export async function saveDailyTodos(pageId: string, todos: DailyTodo[]): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // Delete existing and bulk upsert
    for (const todo of todos) {
      await supabase.from('daily_todos').upsert(todo);
    }
    return;
  }
  setLocal(`daily_todos_${pageId}`, todos);
}

export async function saveDailySchedule(pageId: string, schedule: DailySchedule[]): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    for (const item of schedule) {
      await supabase.from('daily_schedule').upsert(item);
    }
    return;
  }
  setLocal(`daily_schedule_${pageId}`, schedule);
}

// "Carry forward unfinished to tomorrow"
export async function carryForwardUnfinishedTodos(
  userId: string,
  currentDate: string,
  tomorrowDate: string,
  unfinishedTodos: DailyTodo[]
): Promise<number> {
  if (!unfinishedTodos.length) return 0;

  const tomorrowData = await getDailyPage(userId, tomorrowDate);
  const newTodos: DailyTodo[] = [
    ...tomorrowData.todos.filter((t) => t.text.trim().length > 0),
    ...unfinishedTodos.map((t) => ({
      id: crypto.randomUUID(),
      daily_page_id: tomorrowData.page.id,
      user_id: userId,
      text: t.text,
      done: false,
      sort_order: tomorrowData.todos.length + 1
    }))
  ];

  // Fill up to at least 8 rows
  while (newTodos.length < 8) {
    newTodos.push({
      id: crypto.randomUUID(),
      daily_page_id: tomorrowData.page.id,
      user_id: userId,
      text: '',
      done: false,
      sort_order: newTodos.length
    });
  }

  await saveDailyTodos(tomorrowData.page.id, newTodos);
  return unfinishedTodos.length;
}

// Scan past 7 days for any unfinished todos that haven't been completed
export async function getPastUnfinishedTodos(
  userId: string,
  currentDateStr: string
): Promise<{ sourceDate: string; count: number; todos: DailyTodo[] } | null> {
  try {
    const currDate = parseISO(currentDateStr);
    for (let i = 1; i <= 7; i++) {
      const pastDateStr = format(subDays(currDate, i), 'yyyy-MM-dd');
      const pastData = await getDailyPage(userId, pastDateStr);
      const unfinished = (pastData.todos || []).filter(
        (t) => !t.done && t.text.trim().length > 0
      );
      if (unfinished.length > 0) {
        return {
          sourceDate: pastDateStr,
          count: unfinished.length,
          todos: unfinished
        };
      }
    }
    return null;
  } catch (err) {
    console.error('Error scanning past unfinished todos:', err);
    return null;
  }
}

// Roll selected unfinished todos into target date's list
export async function rollTodosIntoDate(
  userId: string,
  targetDateStr: string,
  todosToRoll: DailyTodo[]
): Promise<DailyTodo[]> {
  const targetData = await getDailyPage(userId, targetDateStr);
  const existingNonEmpty = (targetData.todos || []).filter((t) => t.text.trim().length > 0);
  
  // Prevent duplicate insertion of identical task texts
  const existingTexts = new Set(existingNonEmpty.map((t) => t.text.trim().toLowerCase()));
  const toAdd = todosToRoll.filter((t) => !existingTexts.has(t.text.trim().toLowerCase()));

  const newTodos: DailyTodo[] = [
    ...existingNonEmpty,
    ...toAdd.map((t, idx) => ({
      id: crypto.randomUUID(),
      daily_page_id: targetData.page.id,
      user_id: userId,
      text: t.text,
      done: false,
      sort_order: existingNonEmpty.length + idx,
      estimated_minutes: t.estimated_minutes
    }))
  ];

  while (newTodos.length < 8) {
    newTodos.push({
      id: crypto.randomUUID(),
      daily_page_id: targetData.page.id,
      user_id: userId,
      text: '',
      done: false,
      sort_order: newTodos.length
    });
  }

  await saveDailyTodos(targetData.page.id, newTodos);
  return newTodos;
}

/* ==============================================================================
 * 3. MONTHLY REVIEW / SELF APPRAISAL (Page 2)
 * ============================================================================== */
export async function getMonthlyReview(userId: string, year: number, month: number): Promise<MonthlyReview> {
  if (isSupabaseConfigured && supabase) {
    let { data, error } = await supabase
      .from('monthly_reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;

    // Create record
    const { data: newReview, error: createError } = await supabase
      .from('monthly_reviews')
      .insert({
        user_id: userId,
        year,
        month,
        time_audit: {},
        hours_goal_planning: 0,
        hours_implementation: 0,
        hours_review: 0,
        hours_innovation: 0,
        hours_solution: 0,
        notes: {},
        results: '',
        salary_for_results: 0,
        progress_this_month: '',
        progress_last_month: '',
        next_month_goal: ''
      })
      .select()
      .single();
    if (createError) throw createError;
    return newReview;
  }

  const key = `monthly_${userId}`;
  const store = getLocal<Record<string, MonthlyReview>>(key, {});
  const ymKey = `${year}_${month}`;

  if (!store[ymKey]) {
    store[ymKey] = {
      id: crypto.randomUUID(),
      user_id: userId,
      year,
      month,
      time_audit: {
        '1': [true, true, true, false],
        '2': [true, true, false, true],
        '3': [true, true, true, true],
        '4': [true, false, true, false],
        '5': [true, true, true, true],
      },
      hours_goal_planning: 18,
      hours_implementation: 72,
      hours_review: 14,
      hours_innovation: 16,
      hours_solution: 12,
      notes: {
        goal_planning: 'Weekly strategic goal alignment with quarterly OKRs',
        implementation: 'Active execution of product features and client deliverables',
        review: 'End-of-week retrospectives and time audit analysis',
        innovation: 'Explored automation and modern web tooling integration',
        solution: 'Resolved system bottlenecks in sales onboarding pipeline'
      },
      results: 'Exceeded target revenue milestones by 14%; streamlined service delivery workflow.',
      salary_for_results: 250000,
      progress_this_month: 'Completed 8 key initiatives across System and Service modules.',
      progress_last_month: 'Initialized master strategic diary and aligned core leadership team.',
      next_month_goal: 'Scale enterprise client onboarding and launch new promotional campaign.'
    };
    setLocal(key, store);
  }

  return store[ymKey];
}

// Sync today's checks or focus slots into Monthly Review's time_audit
export async function syncDailyTicksToMonthlyAudit(
  userId: string,
  dateStr: string, // YYYY-MM-DD
  slots: [boolean, boolean, boolean, boolean]
): Promise<void> {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const review = await getMonthlyReview(userId, year, month);
  const currentAudit = { ...(review.time_audit || {}) };
  currentAudit[String(day)] = slots;

  await saveMonthlyReview(userId, {
    ...review,
    time_audit: currentAudit
  });
}

// Quick-add a to-do to a specific date from global hotkey or quick capture
export async function quickAddTodoToDay(
  userId: string,
  dateStr: string,
  text: string,
  options?: {
    estimated_minutes?: number;
    category?: string;
    scheduled_slot?: string;
  }
): Promise<DailyTodo> {
  const { page, todos } = await getDailyPage(userId, dateStr);
  const newTodo: DailyTodo = {
    id: crypto.randomUUID(),
    daily_page_id: page.id,
    user_id: userId,
    text,
    done: false,
    sort_order: todos.length,
    estimated_minutes: options?.estimated_minutes,
    category: options?.category,
    scheduled_slot: options?.scheduled_slot,
    created_at: new Date().toISOString()
  };
  const updatedTodos = [...todos, newTodo];
  await saveDailyTodos(page.id, updatedTodos);
  return newTodo;
}

export async function saveMonthlyReview(userId: string, review: MonthlyReview): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('monthly_reviews')
      .upsert({ ...review, user_id: userId, updated_at: new Date().toISOString() });
    if (error) throw error;
    return;
  }

  const key = `monthly_${userId}`;
  const store = getLocal<Record<string, MonthlyReview>>(key, {});
  store[`${review.year}_${review.month}`] = {
    ...review,
    updated_at: new Date().toISOString()
  };
  setLocal(key, store);
}

/* ==============================================================================
 * 4. GOAL TRACKER (Page 3)
 * ============================================================================== */
export async function getGoals(userId: string): Promise<Goal[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  const key = `goals_${userId}`;
  let list = getLocal<Goal[]>(key, []);
  if (list.length === 0) {
    list = [
      {
        id: crypto.randomUUID(),
        user_id: userId,
        goal: 'Increase Annual Recurring Revenue by 25%',
        result_indicator: '₹ 1.2 Crore booked contracts',
        action_plan: 'Target tier-1 enterprise partnerships & renewal expansion',
        todo: 'Prepare executive pitch deck and reach out to top 20 prospects',
        status: 1, // in progress
        sort_order: 0
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        goal: 'Systemize Internal Service Delivery Operations',
        result_indicator: 'Customer satisfaction score > 94%, turnaround < 24h',
        action_plan: 'Implement automated check-lists and SOP checklists',
        todo: 'Document standard operating procedures for team leads',
        status: 2, // done
        sort_order: 1
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        goal: 'Establish Mind Fitness & Daily Strategic Reading Habit',
        result_indicator: 'Read 2 business books per month + daily notes in diary',
        action_plan: 'Block 6:00 AM - 7:00 AM daily for uninterrupted reading',
        todo: 'Order Q1 curated reading list & set morning notification',
        status: 1, // in progress
        sort_order: 2
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        goal: 'Launch High-Impact Q4 Digital Promotion Plan',
        result_indicator: '300 Qualified Inbound B2B Inquiries',
        action_plan: 'Execute targeted LinkedIn & multi-channel strategy',
        todo: 'Finalize promotional creative assets and budget allocations',
        status: 0, // not started
        sort_order: 3
      }
    ];
    setLocal(key, list);
  }
  return list;
}

export async function saveGoal(userId: string, goal: Goal): Promise<Goal> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('goals')
      .upsert({ ...goal, user_id: userId, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const key = `goals_${userId}`;
  const list = getLocal<Goal[]>(key, []);
  const idx = list.findIndex((g) => g.id === goal.id);
  if (idx >= 0) {
    list[idx] = { ...goal, updated_at: new Date().toISOString() };
  } else {
    list.push({ ...goal, id: goal.id || crypto.randomUUID(), updated_at: new Date().toISOString() });
  }
  setLocal(key, list);
  return goal;
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('goals').delete().eq('id', goalId).eq('user_id', userId);
    if (error) throw error;
    return;
  }

  const key = `goals_${userId}`;
  const list = getLocal<Goal[]>(key, []).filter((g) => g.id !== goalId);
  setLocal(key, list);
}

export async function reorderGoals(userId: string, reordered: Goal[]): Promise<void> {
  const updated = reordered.map((g, i) => ({ ...g, sort_order: i }));
  if (isSupabaseConfigured && supabase) {
    for (const item of updated) {
      await supabase.from('goals').upsert(item);
    }
    return;
  }
  setLocal(`goals_${userId}`, updated);
}

/* ==============================================================================
 * 5. SMART GOALS WORKSHEET (Page 4)
 * ============================================================================== */
export async function getSmartGoals(userId: string): Promise<{
  smartGoals: SmartGoal[];
  steps: Record<string, SmartGoalStep[]>;
  milestones: Record<string, SmartGoalMilestone[]>;
}> {
  if (isSupabaseConfigured && supabase) {
    const { data: goals, error } = await supabase
      .from('smart_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const stepsMap: Record<string, SmartGoalStep[]> = {};
    const milesMap: Record<string, SmartGoalMilestone[]> = {};

    if (goals && goals.length > 0) {
      const goalIds = goals.map((g) => g.id);
      const { data: allSteps } = await supabase
        .from('smart_goal_steps')
        .select('*')
        .in('smart_goal_id', goalIds)
        .order('sort_order', { ascending: true });

      const { data: allMiles } = await supabase
        .from('smart_goal_milestones')
        .select('*')
        .in('smart_goal_id', goalIds)
        .order('date', { ascending: true });

      (allSteps || []).forEach((s) => {
        if (!stepsMap[s.smart_goal_id]) stepsMap[s.smart_goal_id] = [];
        stepsMap[s.smart_goal_id].push(s);
      });

      (allMiles || []).forEach((m) => {
        if (!milesMap[m.smart_goal_id]) milesMap[m.smart_goal_id] = [];
        milesMap[m.smart_goal_id].push(m);
      });
    }

    return {
      smartGoals: goals || [],
      steps: stepsMap,
      milestones: milesMap
    };
  }

  // Local / Offline demo
  const gKey = `smart_goals_${userId}`;
  let goals = getLocal<SmartGoal[]>(gKey, []);
  let stepsMap = getLocal<Record<string, SmartGoalStep[]>>(`smart_steps_${userId}`, {});
  let milesMap = getLocal<Record<string, SmartGoalMilestone[]>>(`smart_miles_${userId}`, {});

  if (goals.length === 0) {
    const demoId = crypto.randomUUID();
    const demoGoal: SmartGoal = {
      id: demoId,
      user_id: userId,
      goal: 'Launch the Digital Business Strategy Diary PWA for 500 Active Subscribers',
      purpose: 'Provide paper planner lovers with an intuitive digital mobile experience that increases daily productivity and strategic discipline.',
      challenges: 'Ensuring offline synchronization, ultra-fast autosave debouncing, and authentic paper-look diary reproduction.',
      is_specific: true,
      is_measurable: true,
      is_achievable: true,
      is_reason: true,
      is_timebound: true,
      completion_date: '2026-12-31'
    };
    goals = [demoGoal];
    setLocal(gKey, goals);

    stepsMap[demoId] = [
      { id: crypto.randomUUID(), smart_goal_id: demoId, user_id: userId, description: 'Finalize brand palette and dairy paper CSS', start_date: '2026-11-01', finish_date: '2026-11-05', done: true, sort_order: 0 },
      { id: crypto.randomUUID(), smart_goal_id: demoId, user_id: userId, description: 'Implement Daily Planner with Priorities and 6am-9pm schedule', start_date: '2026-11-06', finish_date: '2026-11-12', done: true, sort_order: 1 },
      { id: crypto.randomUUID(), smart_goal_id: demoId, user_id: userId, description: 'Develop Monthly Review & Time Audit Matrix', start_date: '2026-11-13', finish_date: '2026-11-18', done: true, sort_order: 2 },
      { id: crypto.randomUUID(), smart_goal_id: demoId, user_id: userId, description: 'Build SMART Goals Worksheet with milestone progress chart', start_date: '2026-11-19', finish_date: '2026-11-25', done: false, sort_order: 3 },
      { id: crypto.randomUUID(), smart_goal_id: demoId, user_id: userId, description: 'Setup Promotion Plans & Management Systems tabs', start_date: '2026-11-26', finish_date: '2026-12-05', done: false, sort_order: 4 },
      { id: crypto.randomUUID(), smart_goal_id: demoId, user_id: userId, description: 'Print / Download PDF stylesheets testing on A4/A5', start_date: '2026-12-06', finish_date: '2026-12-15', done: false, sort_order: 5 },
      { id: crypto.randomUUID(), smart_goal_id: demoId, user_id: userId, description: 'Full multi-user RLS testing & PWA offline audit', start_date: '2026-12-16', finish_date: '2026-12-28', done: false, sort_order: 6 },
    ];
    setLocal(`smart_steps_${userId}`, stepsMap);

    milesMap[demoId] = [
      { id: crypto.randomUUID(), smart_goal_id: demoId, user_id: userId, date: '2026-11-01', measure: 15, note: 'Architecture drafted' },
      { id: crypto.randomUUID(), smart_goal_id: demoId, user_id: userId, date: '2026-11-08', measure: 35, note: 'Daily planner ready' },
      { id: crypto.randomUUID(), smart_goal_id: demoId, user_id: userId, date: '2026-11-15', measure: 60, note: 'Monthly review audit complete' },
      { id: crypto.randomUUID(), smart_goal_id: demoId, user_id: userId, date: '2026-11-18', measure: 80, note: 'Milestone tracking live' },
    ];
    setLocal(`smart_miles_${userId}`, milesMap);
  }

  return { smartGoals: goals, steps: stepsMap, milestones: milesMap };
}

export async function saveSmartGoal(userId: string, goal: SmartGoal): Promise<SmartGoal> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('smart_goals')
      .upsert({ ...goal, user_id: userId, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const key = `smart_goals_${userId}`;
  const list = getLocal<SmartGoal[]>(key, []);
  const idx = list.findIndex((g) => g.id === goal.id);
  if (idx >= 0) {
    list[idx] = { ...goal, updated_at: new Date().toISOString() };
  } else {
    list.unshift({ ...goal, id: goal.id || crypto.randomUUID(), updated_at: new Date().toISOString() });
  }
  setLocal(key, list);
  return goal;
}

export async function deleteSmartGoal(userId: string, goalId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('smart_goals').delete().eq('id', goalId).eq('user_id', userId);
    return;
  }
  const gKey = `smart_goals_${userId}`;
  const list = getLocal<SmartGoal[]>(gKey, []).filter((g) => g.id !== goalId);
  setLocal(gKey, list);
}

export async function saveSmartGoalSteps(userId: string, smartGoalId: string, steps: SmartGoalStep[]): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    for (const step of steps) {
      await supabase.from('smart_goal_steps').upsert({ ...step, user_id: userId, smart_goal_id: smartGoalId });
    }
    return;
  }
  const stepsMap = getLocal<Record<string, SmartGoalStep[]>>(`smart_steps_${userId}`, {});
  stepsMap[smartGoalId] = steps;
  setLocal(`smart_steps_${userId}`, stepsMap);
}

export async function saveSmartGoalMilestones(userId: string, smartGoalId: string, milestones: SmartGoalMilestone[]): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    for (const m of milestones) {
      await supabase.from('smart_goal_milestones').upsert({ ...m, user_id: userId, smart_goal_id: smartGoalId });
    }
    return;
  }
  const milesMap = getLocal<Record<string, SmartGoalMilestone[]>>(`smart_miles_${userId}`, {});
  milesMap[smartGoalId] = milestones;
  setLocal(`smart_miles_${userId}`, milesMap);
}

/* ==============================================================================
 * 6. PROMOTION PLANS (Page 5)
 * ============================================================================== */
export async function getPromotionPlans(userId: string): Promise<{
  plans: PromotionPlan[];
  items: Record<string, PromotionPlanItem[]>;
}> {
  if (isSupabaseConfigured && supabase) {
    const { data: plans, error } = await supabase
      .from('promotion_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const itemsMap: Record<string, PromotionPlanItem[]> = {};
    if (plans && plans.length > 0) {
      const planIds = plans.map((p) => p.id);
      const { data: allItems } = await supabase
        .from('promotion_plan_items')
        .select('*')
        .in('plan_id', planIds)
        .order('sl_no', { ascending: true });

      (allItems || []).forEach((item) => {
        if (!itemsMap[item.plan_id]) itemsMap[item.plan_id] = [];
        itemsMap[item.plan_id].push(item);
      });
    }

    return { plans: plans || [], items: itemsMap };
  }

  // Local / Offline demo
  const pKey = `promo_plans_${userId}`;
  let plans = getLocal<PromotionPlan[]>(pKey, []);
  let itemsMap = getLocal<Record<string, PromotionPlanItem[]>>(`promo_items_${userId}`, {});

  if (plans.length === 0) {
    const planId = crypto.randomUUID();
    const demoPlan: PromotionPlan = {
      id: planId,
      user_id: userId,
      title: 'Q4 National Business Expansion Campaign',
      objective: 'Accelerate brand authority and acquire 120 high-value corporate client accounts before year-end.'
    };
    plans = [demoPlan];
    setLocal(pKey, plans);

    // Seed 12 rows (min 12 required by prompt)
    const initialItems: PromotionPlanItem[] = [
      { id: crypto.randomUUID(), plan_id: planId, user_id: userId, sl_no: 1, plan_of_action: 'Direct Executive Outreach to Top 50 Retailers', responsibility: 'Sales Lead (Rajesh)', budget: 35000, deadline: '2026-11-20' },
      { id: crypto.randomUUID(), plan_id: planId, user_id: userId, sl_no: 2, plan_of_action: 'LinkedIn B2B Leadership Thought Articles', responsibility: 'Content Team (Pooja)', budget: 15000, deadline: '2026-11-21' },
      { id: crypto.randomUUID(), plan_id: planId, user_id: userId, sl_no: 3, plan_of_action: 'Annual Business Diary Gifting to VIP Clients', responsibility: 'Operations (Akalya)', budget: 75000, deadline: '2026-11-15' }, // Overdue example
      { id: crypto.randomUUID(), plan_id: planId, user_id: userId, sl_no: 4, plan_of_action: 'High-Converting Landing Page Re-design', responsibility: 'Design Lead', budget: 25000, deadline: '2026-11-22' },
      { id: crypto.randomUUID(), plan_id: planId, user_id: userId, sl_no: 5, plan_of_action: 'Webinar: "1% Daily Improvement in Systems"', responsibility: 'CEO / Founder', budget: 12000, deadline: '2026-11-30' },
      { id: crypto.randomUUID(), plan_id: planId, user_id: userId, sl_no: 6, plan_of_action: 'Case Study Video Production with Client', responsibility: 'Media Agency', budget: 45000, deadline: '2026-12-05' },
      { id: crypto.randomUUID(), plan_id: planId, user_id: userId, sl_no: 7, plan_of_action: 'Email Automation Sequence to Inactive Leads', responsibility: 'Growth Manager', budget: 10000, deadline: '2026-12-10' },
      { id: crypto.randomUUID(), plan_id: planId, user_id: userId, sl_no: 8, plan_of_action: 'Trade Association Networking Sponsor Booth', responsibility: 'Events Lead', budget: 85000, deadline: '2026-12-15' },
      { id: crypto.randomUUID(), plan_id: planId, user_id: userId, sl_no: 9, plan_of_action: 'Customer Testimonial Press Release', responsibility: 'PR Specialist', budget: 20000, deadline: '2026-12-18' },
      { id: crypto.randomUUID(), plan_id: planId, user_id: userId, sl_no: 10, plan_of_action: 'Sales Incentive Competition (Team Target)', responsibility: 'HR Director', budget: 50000, deadline: '2026-12-24' },
      { id: crypto.randomUUID(), plan_id: planId, user_id: userId, sl_no: 11, plan_of_action: 'Year-End Strategic Customer Retention Call', responsibility: 'Key Accounts', budget: 8000, deadline: '2026-12-28' },
      { id: crypto.randomUUID(), plan_id: planId, user_id: userId, sl_no: 12, plan_of_action: 'Post-Campaign ROI & Analytics Review', responsibility: 'Finance & Analytics', budget: 5000, deadline: '2026-12-31' },
    ];
    itemsMap[planId] = initialItems;
    setLocal(`promo_items_${userId}`, itemsMap);
  }

  return { plans, items: itemsMap };
}

export async function savePromotionPlan(userId: string, plan: PromotionPlan): Promise<PromotionPlan> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('promotion_plans')
      .upsert({ ...plan, user_id: userId, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const pKey = `promo_plans_${userId}`;
  const plans = getLocal<PromotionPlan[]>(pKey, []);
  const idx = plans.findIndex((p) => p.id === plan.id);
  if (idx >= 0) {
    plans[idx] = { ...plan, updated_at: new Date().toISOString() };
  } else {
    plans.unshift({ ...plan, id: plan.id || crypto.randomUUID(), updated_at: new Date().toISOString() });
  }
  setLocal(pKey, plans);
  return plan;
}

export async function savePromotionPlanItems(userId: string, planId: string, items: PromotionPlanItem[]): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    for (const item of items) {
      await supabase.from('promotion_plan_items').upsert({ ...item, plan_id: planId, user_id: userId });
    }
    return;
  }
  const itemsMap = getLocal<Record<string, PromotionPlanItem[]>>(`promo_items_${userId}`, {});
  itemsMap[planId] = items;
  setLocal(`promo_items_${userId}`, itemsMap);
}

/* ==============================================================================
 * 7. MANAGEMENT SYSTEMS (Page 6: System / Service / Sales)
 * ============================================================================== */
export async function getManagementItems(userId: string, type: ManagementType): Promise<ManagementItem[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('management_items')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  const key = `mgmt_${userId}_${type}`;
  let items = getLocal<ManagementItem[]>(key, []);

  if (items.length === 0) {
    // 7 initial rows per type (minimum 7 rows)
    const defaultsByType: Record<ManagementType, { c: string; r: string; s: string; st: 'Open' | 'Solved' }[]> = {
      system: [
        { c: 'Inventory tracking delays between warehouse and retail', r: 'Manual paper entry at receiving dock', s: 'Deploy mobile barcode scanner system directly into ERP', st: 'Solved' },
        { c: 'Software deployment bottlenecks on release day', r: 'Lack of automated staging test pipelines', s: 'Implement CI/CD automated regression testing', st: 'Solved' },
        { c: 'Client invoice reconciliation takes 4 days', r: 'Unstructured receipt collection from field team', s: 'Digitize receipt uploads via PWA mobile app', st: 'Open' },
        { c: '', r: '', s: '', st: 'Open' },
        { c: '', r: '', s: '', st: 'Open' },
        { c: '', r: '', s: '', st: 'Open' },
        { c: '', r: '', s: '', st: 'Open' },
      ],
      service: [
        { c: 'Customer support response time exceeds 4 hours', r: 'Emails scattered across multiple agent inboxes', s: 'Centralize into unified ticketing queue with SLA triggers', st: 'Solved' },
        { c: 'Field technicians missing scheduled maintenance visits', r: 'Route scheduling done on paper diary without GPS', s: 'Set automated SMS dispatch and route optimization', st: 'Open' },
        { c: 'Recurring customer onboarding questions', r: 'Onboarding guide is a 40-page PDF document', s: 'Create 3-minute interactive video walkthrough', st: 'Solved' },
        { c: '', r: '', s: '', st: 'Open' },
        { c: '', r: '', s: '', st: 'Open' },
        { c: '', r: '', s: '', st: 'Open' },
        { c: '', r: '', s: '', st: 'Open' },
      ],
      sales: [
        { c: 'Lead conversion drop-off between demo and quotation', r: 'Proposals taking over 48 hours to generate', s: 'Standardize quotation templates with one-click pricing', st: 'Solved' },
        { c: 'Sales reps discounting margins excessively', r: 'Unclear tier-based commission structure', s: 'Tie representative bonus percentage to retained gross margin', st: 'Open' },
        { c: 'Cold outreach response rate under 2%', r: 'Generic untargeted email scripts', s: 'Personalize outreach with industry-specific case study metrics', st: 'Open' },
        { c: '', r: '', s: '', st: 'Open' },
        { c: '', r: '', s: '', st: 'Open' },
        { c: '', r: '', s: '', st: 'Open' },
        { c: '', r: '', s: '', st: 'Open' },
      ]
    };

    items = defaultsByType[type].map((d, i) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      type,
      challenge: d.c,
      reason: d.r,
      solution: d.s,
      status: d.st,
      sort_order: i
    }));
    setLocal(key, items);
  }

  return items;
}

export async function saveManagementItems(userId: string, type: ManagementType, items: ManagementItem[]): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    for (const item of items) {
      await supabase.from('management_items').upsert({ ...item, user_id: userId, type });
    }
    return;
  }
  const key = `mgmt_${userId}_${type}`;
  setLocal(key, items);
}

/* ==============================================================================
 * 8. ADMIN QUERIES (Metadata only - zero diary content access)
 * ============================================================================== */
export async function getAdminUsersList(): Promise<Profile[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('profiles').select('id, name, business_name, timezone, is_admin, created_at, updated_at');
    if (error) throw error;
    return data || [];
  }

  const profilesMap = getLocal<Record<string, Profile>>('profiles', {});
  return Object.values(profilesMap);
}
