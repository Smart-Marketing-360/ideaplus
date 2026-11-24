export interface Profile {
  id: string;
  name: string;
  business_name: string;
  logo_url?: string;
  phone?: string;
  timezone?: string;
  is_admin?: boolean;
  daily_checks_labels?: string[];
  time_audit_labels?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DailyPage {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  check1: boolean;
  check2: boolean;
  check3: boolean;
  check4: boolean;
  priorities: string[]; // up to 5 priorities
  goal_for_day: string;
  linked_goal_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DailyTodo {
  id: string;
  daily_page_id: string;
  user_id: string;
  text: string;
  done: boolean;
  sort_order: number;
  estimated_minutes?: number; // e.g. 15, 30, 45, 60, 90, 120
  scheduled_slot?: string; // e.g. "9 AM", "10 AM"
  category?: 'strategy' | 'sales' | 'systems' | 'operations' | string;
  created_at?: string;
}

export interface DailySchedule {
  id: string;
  daily_page_id: string;
  user_id: string;
  time_slot: string; // "6 AM", "7 AM", ..., "Noon", "1 PM", ..., "9 PM"
  activity: string;
  created_at?: string;
}

export interface MonthlyReview {
  id: string;
  user_id: string;
  year: number;
  month: number; // 1 - 12
  time_audit: Record<string, boolean[]>; // e.g. { "1": [true, false, true, false], ... }
  hours_goal_planning: number;
  hours_implementation: number;
  hours_review: number;
  hours_innovation: number;
  hours_solution: number;
  notes: {
    goal_planning?: string;
    implementation?: string;
    review?: string;
    innovation?: string;
    solution?: string;
  };
  results: string;
  salary_for_results: number;
  progress_this_month: string;
  progress_last_month: string;
  next_month_goal: string;
  created_at?: string;
  updated_at?: string;
}

export type GoalStatus = 0 | 1 | 2; // 0: Not started, 1: In progress, 2: Done

export interface Goal {
  id: string;
  user_id: string;
  goal: string;
  result_indicator: string;
  action_plan: string;
  todo: string;
  status: GoalStatus;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface SmartGoal {
  id: string;
  user_id: string;
  goal: string;
  purpose: string;
  challenges: string;
  is_specific: boolean;
  is_measurable: boolean;
  is_achievable: boolean;
  is_reason: boolean;
  is_timebound: boolean;
  completion_date: string; // YYYY-MM-DD
  created_at?: string;
  updated_at?: string;
}

export interface SmartGoalStep {
  id: string;
  smart_goal_id: string;
  user_id: string;
  description: string;
  start_date: string;
  finish_date: string;
  done: boolean;
  sort_order: number;
  created_at?: string;
}

export interface SmartGoalMilestone {
  id: string;
  smart_goal_id: string;
  user_id: string;
  date: string;
  measure: number;
  note?: string;
  created_at?: string;
}

export interface PromotionPlan {
  id: string;
  user_id: string;
  title: string;
  objective: string;
  linked_goal_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PromotionPlanItem {
  id: string;
  plan_id: string;
  user_id: string;
  sl_no: number;
  plan_of_action: string;
  responsibility: string;
  budget: number;
  deadline: string; // YYYY-MM-DD
  created_at?: string;
}

export type ManagementType = 'system' | 'service' | 'sales';
export type ManagementStatus = 'Open' | 'Solved';

export interface ManagementItem {
  id: string;
  user_id: string;
  type: ManagementType;
  challenge: string;
  reason: string;
  solution: string;
  status: ManagementStatus;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}
