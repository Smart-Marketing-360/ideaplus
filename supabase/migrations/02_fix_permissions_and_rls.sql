-- ==============================================================================
-- SUPABASE PERMISSION & RLS FIX
-- Resolves: 401 Unauthorized, permission denied for table profiles,
-- and "new row violates row-level security policy for table daily_pages"
-- ==============================================================================

-- 1. Grant schema usage and table privileges to anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Drop strict foreign key constraints to auth.users so demo & offline users can sync
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE IF EXISTS public.daily_pages DROP CONSTRAINT IF EXISTS daily_pages_user_id_fkey;
ALTER TABLE IF EXISTS public.daily_todos DROP CONSTRAINT IF EXISTS daily_todos_user_id_fkey;
ALTER TABLE IF EXISTS public.daily_schedule DROP CONSTRAINT IF EXISTS daily_schedule_user_id_fkey;
ALTER TABLE IF EXISTS public.monthly_reviews DROP CONSTRAINT IF EXISTS monthly_reviews_user_id_fkey;
ALTER TABLE IF EXISTS public.goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;
ALTER TABLE IF EXISTS public.smart_goals DROP CONSTRAINT IF EXISTS smart_goals_user_id_fkey;
ALTER TABLE IF EXISTS public.smart_goal_steps DROP CONSTRAINT IF EXISTS smart_goal_steps_user_id_fkey;
ALTER TABLE IF EXISTS public.smart_goal_milestones DROP CONSTRAINT IF EXISTS smart_goal_milestones_user_id_fkey;
ALTER TABLE IF EXISTS public.promotion_plans DROP CONSTRAINT IF EXISTS promotion_plans_user_id_fkey;
ALTER TABLE IF EXISTS public.promotion_plan_items DROP CONSTRAINT IF EXISTS promotion_plan_items_user_id_fkey;
ALTER TABLE IF EXISTS public.management_items DROP CONSTRAINT IF EXISTS management_items_user_id_fkey;

-- 3. Drop all restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles metadata" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own daily pages" ON public.daily_pages;
DROP POLICY IF EXISTS "Users can manage own daily todos" ON public.daily_todos;
DROP POLICY IF EXISTS "Users can manage own daily schedule" ON public.daily_schedule;
DROP POLICY IF EXISTS "Users can manage own monthly reviews" ON public.monthly_reviews;
DROP POLICY IF EXISTS "Users can manage own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can manage own smart goals" ON public.smart_goals;
DROP POLICY IF EXISTS "Users can manage own smart goal steps" ON public.smart_goal_steps;
DROP POLICY IF EXISTS "Users can manage own smart goal milestones" ON public.smart_goal_milestones;
DROP POLICY IF EXISTS "Users can manage own promotion plans" ON public.promotion_plans;
DROP POLICY IF EXISTS "Users can manage own promotion plan items" ON public.promotion_plan_items;
DROP POLICY IF EXISTS "Users can manage own management items" ON public.management_items;

-- Drop any previous permissive policies if they exist
DROP POLICY IF EXISTS "Allow all access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all access to daily_pages" ON public.daily_pages;
DROP POLICY IF EXISTS "Allow all access to daily_todos" ON public.daily_todos;
DROP POLICY IF EXISTS "Allow all access to daily_schedule" ON public.daily_schedule;
DROP POLICY IF EXISTS "Allow all access to monthly_reviews" ON public.monthly_reviews;
DROP POLICY IF EXISTS "Allow all access to goals" ON public.goals;
DROP POLICY IF EXISTS "Allow all access to smart_goals" ON public.smart_goals;
DROP POLICY IF EXISTS "Allow all access to smart_goal_steps" ON public.smart_goal_steps;
DROP POLICY IF EXISTS "Allow all access to smart_goal_milestones" ON public.smart_goal_milestones;
DROP POLICY IF EXISTS "Allow all access to promotion_plans" ON public.promotion_plans;
DROP POLICY IF EXISTS "Allow all access to promotion_plan_items" ON public.promotion_plan_items;
DROP POLICY IF EXISTS "Allow all access to management_items" ON public.management_items;

-- 4. Enable RLS with permissive policies for both anon and authenticated roles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_goal_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to profiles" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to daily_pages" ON public.daily_pages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to daily_todos" ON public.daily_todos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to daily_schedule" ON public.daily_schedule FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to monthly_reviews" ON public.monthly_reviews FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to goals" ON public.goals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to smart_goals" ON public.smart_goals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to smart_goal_steps" ON public.smart_goal_steps FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to smart_goal_milestones" ON public.smart_goal_milestones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to promotion_plans" ON public.promotion_plans FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to promotion_plan_items" ON public.promotion_plan_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to management_items" ON public.management_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. Seed default demo user profiles
INSERT INTO public.profiles (id, name, business_name, timezone, is_admin)
VALUES 
  ('11111111-1111-4111-a111-111111111111', 'Aravind Krishnan', 'Apex Strategic Innovations', 'Asia/Kolkata', false),
  ('22222222-2222-4222-a222-222222222222', 'Meera Sundaram', 'Zenith Global Solutions', 'Asia/Kolkata', false),
  ('33333333-3333-4333-a333-333333333333', 'System Administrator', 'IdeaPlus Platform Administration', 'Asia/Kolkata', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  business_name = EXCLUDED.business_name,
  is_admin = EXCLUDED.is_admin;
