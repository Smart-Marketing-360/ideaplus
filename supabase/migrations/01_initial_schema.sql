-- ==============================================================================
-- BUSINESS DIARY - COMPLETE POSTGRESQL SCHEMA WITH ROW LEVEL SECURITY (RLS)
-- "1% Improvement leads to No 1"
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (User metadata & settings)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text default '',
  business_name text default '',
  logo_url text default '',
  phone text default '',
  timezone text default 'Asia/Kolkata',
  is_admin boolean default false,
  daily_checks_labels jsonb default '["Prayer / Meditation", "Mind Fitness (Reading)", "Physical Fitness", "Family Time"]'::jsonb,
  time_audit_labels jsonb default '["Slot 1 (Morning)", "Slot 2 (Mid-Day)", "Slot 3 (Afternoon)", "Slot 4 (Evening)"]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Policy: User can view and update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Policy: Admin can view user list metadata (count, last active, name) but cannot read diary content
create policy "Admins can view all profiles metadata"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    )
  );

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, business_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'business_name', 'My Business')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. DAILY PLANNER (Page 1)
-- ------------------------------------------------------------------------------
create table if not exists public.daily_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  check1 boolean default false,
  check2 boolean default false,
  check3 boolean default false,
  check4 boolean default false,
  priorities jsonb default '["", "", "", "", ""]'::jsonb,
  goal_for_day text default '',
  linked_goal_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint daily_pages_user_date_key unique (user_id, date)
);

alter table public.daily_pages enable row level security;

create policy "Users can manage own daily pages"
  on public.daily_pages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- To-do items on the daily page (default 8 rows + add more)
create table if not exists public.daily_todos (
  id uuid primary key default gen_random_uuid(),
  daily_page_id uuid not null references public.daily_pages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text default '',
  done boolean default false,
  sort_order int default 0,
  estimated_minutes int default null,
  scheduled_slot text default null,
  created_at timestamptz default now()
);

alter table public.daily_todos enable row level security;

create policy "Users can manage own daily todos"
  on public.daily_todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Schedule slots (6am to 9pm)
create table if not exists public.daily_schedule (
  id uuid primary key default gen_random_uuid(),
  daily_page_id uuid not null references public.daily_pages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  time_slot text not null, -- '6 AM', '7 AM', ... 'Noon', '1 PM' ... '9 PM'
  activity text default '',
  created_at timestamptz default now()
);

alter table public.daily_schedule enable row level security;

create policy "Users can manage own daily schedule"
  on public.daily_schedule for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. MONTHLY REVIEW / SELF APPRAISAL (Page 2)
-- ------------------------------------------------------------------------------
create table if not exists public.monthly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  time_audit jsonb default '{}'::jsonb, -- { "1": [true,false,true,false], "2": [...] }
  hours_goal_planning numeric default 0,
  hours_implementation numeric default 0,
  hours_review numeric default 0,
  hours_innovation numeric default 0,
  hours_solution numeric default 0,
  notes jsonb default '{}'::jsonb, -- { "goal_planning": "", "implementation": "", ... }
  results text default '',
  salary_for_results numeric default 0,
  progress_this_month text default '',
  progress_last_month text default '',
  next_month_goal text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint monthly_reviews_user_ym_key unique (user_id, year, month)
);

alter table public.monthly_reviews enable row level security;

create policy "Users can manage own monthly reviews"
  on public.monthly_reviews for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. GOAL TRACKER (Page 3)
-- ------------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text default '',
  result_indicator text default '',
  action_plan text default '',
  todo text default '',
  status smallint default 0, -- 0: Not Started, 1: In Progress, 2: Done
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.goals enable row level security;

create policy "Users can manage own goals"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. SMART GOALS WORKSHEET (Page 4)
-- ------------------------------------------------------------------------------
create table if not exists public.smart_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text default '',
  purpose text default '',
  challenges text default '',
  is_specific boolean default false,
  is_measurable boolean default false,
  is_achievable boolean default false,
  is_reason boolean default false,
  is_timebound boolean default false,
  completion_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.smart_goals enable row level security;

create policy "Users can manage own smart goals"
  on public.smart_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Steps for each SMART goal (minimum 7 rows)
create table if not exists public.smart_goal_steps (
  id uuid primary key default gen_random_uuid(),
  smart_goal_id uuid not null references public.smart_goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  description text default '',
  start_date date,
  finish_date date,
  done boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.smart_goal_steps enable row level security;

create policy "Users can manage own smart goal steps"
  on public.smart_goal_steps for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Milestones log for each SMART goal
create table if not exists public.smart_goal_milestones (
  id uuid primary key default gen_random_uuid(),
  smart_goal_id uuid not null references public.smart_goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date default current_date,
  measure numeric default 0,
  note text default '',
  created_at timestamptz default now()
);

alter table public.smart_goal_milestones enable row level security;

create policy "Users can manage own smart goal milestones"
  on public.smart_goal_milestones for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. PROMOTION PLANS (Page 5)
-- ------------------------------------------------------------------------------
create table if not exists public.promotion_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default 'Q4 Business Promotion Plan',
  objective text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.promotion_plans enable row level security;

create policy "Users can manage own promotion plans"
  on public.promotion_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Promotion Plan items (12+ rows)
create table if not exists public.promotion_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.promotion_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sl_no int default 1,
  plan_of_action text default '',
  responsibility text default '',
  budget numeric default 0,
  deadline date,
  created_at timestamptz default now()
);

alter table public.promotion_plan_items enable row level security;

create policy "Users can manage own promotion plan items"
  on public.promotion_plan_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 7. MANAGEMENT SYSTEMS (Page 6: System, Service, Sales)
-- ------------------------------------------------------------------------------
create table if not exists public.management_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('system', 'service', 'sales')),
  challenge text default '',
  reason text default '',
  solution text default '',
  status text default 'Open' check (status in ('Open', 'Solved')),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.management_items enable row level security;

create policy "Users can manage own management items"
  on public.management_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
create index if not exists idx_daily_pages_user_date on public.daily_pages(user_id, date);
create index if not exists idx_daily_todos_page on public.daily_todos(daily_page_id);
create index if not exists idx_daily_schedule_page on public.daily_schedule(daily_page_id);
create index if not exists idx_monthly_reviews_user_ym on public.monthly_reviews(user_id, year, month);
create index if not exists idx_goals_user on public.goals(user_id);
create index if not exists idx_smart_goals_user on public.smart_goals(user_id);
create index if not exists idx_smart_goal_steps_goal on public.smart_goal_steps(smart_goal_id);
create index if not exists idx_smart_goal_milestones_goal on public.smart_goal_milestones(smart_goal_id);
create index if not exists idx_promotion_plans_user on public.promotion_plans(user_id);
create index if not exists idx_promotion_plan_items_plan on public.promotion_plan_items(plan_id);
create index if not exists idx_management_items_user_type on public.management_items(user_id, type);
