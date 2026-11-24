# Business Strategy Diary ("1% Improvement → leads to → No 1")

A mobile-first, installable Progressive Web App (PWA) that is the digital reproduction of the printed executive strategy diary. Built with React, Vite, TypeScript, Tailwind CSS, Supabase (with Postgres Row Level Security), TanStack Query, and print stylesheets for physical A4/A5 paper reproduction.

---

## 🌟 Brand & Physical Diary Styling

- **Color Palette**:
  - **Executive Navy** (`#2A3B6B`, Dark `#1B2647`): Section headers, table lines, desktop sidebar, mobile bottom tab bar, and primary actions.
  - **Golden Yellow** (`#F2B230`, Light `#F8D176`): Active navigation markers, logo badge container, focus quotes, progress rings, lightbulb graphics, and trendline indicators.
  - **Diary Cream** (`#F6EBD3`) and **Cream Row** (`#FAF4E7`): Table header backgrounds, alternating ruled rows, and subtle card accents.
  - **Clean Paper White** (`#FFFFFF`): Main writing surfaces.
  - **Canvas** (`#F7F8FB`): Neutral, non-glare application background.
- **Typography**:
  - **Headings & Numbers**: `Plus Jakarta Sans` (600/700), sentence case, normal letter-spacing.
  - **Body & Forms**: `Inter` (400/500), 15–16px, line-height 1.6.
  - **Tabular Figures**: Strict tabular numbers (`font-variant-numeric: tabular-nums`) across all currency values, dates, percentages, and metrics for clean alignment.
  - **Tamil Fallback**: `Noto Sans Tamil` integrated as fallback font for future localization without design disruption.
- **Branding**:
  - Centralized branding configuration in `src/config/brand.config.ts`.
  - Daily page banner: *"1% Improvement → leads to → No 1"*.
  - Logo and app title featured in the sidebar header with no redundant top-bar duplicates.

---

## 📱 Navigation & Responsive Layout

- **Desktop (≥ 768px)**:
  - Collapsible `232px` sidebar (collapsible to a `64px` icon rail).
  - Navigation grouped into `"Diary"` and `"Plans & systems"`.
  - Active item styled with a golden yellow left marker (`border-diary-gold`) and subtle gold-tinted highlight.
  - Slim `56px` top bar with sentence-case page title, autosave pill (`✓ Saved`), search trigger, notifications bell, and primary action button.
- **Mobile (< 768px)**:
  - Sticky deep navy bottom navigation bar with 5 primary tabs: **Home**, **Daily**, **Goals**, **Plans**, and **More**.
  - All touch targets satisfy mobile accessibility standards (≥ 44px).
  - The `"More"` tab opens a smooth slide-over modal drawer providing access to Monthly Review, SMART Goals, Management Systems, and Settings.
- **Print / PDF View**:
  - Every page features a **"Print / Download PDF"** action.
  - `@media print` stylesheets reproduce the physical paper diary page format on A4/A5 portrait, including the signature curved golden swoosh bars, navy title bars, cream table headers, and tagline without UI chrome.

---

## 🚀 Key Modules & Pages

1. **Dashboard** (`/`):
   - **Row 1**: Today's focus card (quote, date, top 3 priorities, SVG to-do progress ring) taking 2/3 width, and Quick Add card (To-do, Priority, Time tick) taking 1/3 width.
   - **Row 2**: 4 equal KPI cards (Goals completed, Time audit ticks, Open challenges, Overdue plans) with bold tabular numbers and mini trend sparklines.
   - **Row 3**: SMART goals nearing deadline and Campaign promotion deadlines.

2. **Daily Planner** (`/daily`):
   - Date picker with Previous / Next Day and Jump to Date calendar.
   - 4 customizable Daily Checks (e.g., Prayer/Meditation, Mind Fitness, Physical Fitness, Family Time).
   - **Priorities Block**: Top 5 strategic focus items with numbered navy/gold circular badges.
   - **Goal For The Day**: Large text box with gold lightbulb graphic and auto-suggestion dropdown to link directly from Goal Tracker.
   - **To-Do List Block**: Checkboxes with strike-through completion, "+ Add to-do row", and **"Carry forward unfinished to tomorrow"** button.
   - **Time / Activity Schedule**: Hourly slots from 6 AM to 9 PM with **"MIND FITNESS"** badge and alternating cream/white rows.

3. **Monthly Review / Self Appraisal** (`/monthly`):
   - Month/Year selector.
   - **Time Audit Grid** (left strip): Days 1–31 with 4 productivity slot check-boxes per day + live total ticks logged counter.
   - **Time Allocation Buckets**: Goal Planning, Implementation, Review, Innovation, and Solution time (hours + executive notes) with responsive adaptive row wrapping.
   - **Comparative Bar Chart**: Visual Recharts bar chart comparing monthly hours across the 5 buckets.
   - **Results of the Month**: Accomplishments and revenue breakthrough register.
   - **Salary for the Results (₹)**: Executive output valuation with Indian Rupee formatting (`₹1,50,000`).
   - **Goal Tracking Comparison**: Side-by-side comparison of *Progress This Month* vs *Progress From Last Month* (pre-fills from prior month).
   - **Next Month Goal**: With one-click **"Copy to next month"** button.

4. **Goal Tracker** (`/goals`):
   - Spreadsheet-style table on desktop; stacked cards on mobile.
   - Columns: `Goal | Result Indicator | Action Plan | To Do | Status`.
   - **3-State Circle Toggle**: Not Started (empty), In Progress (half/amber), Done (filled/emerald).
   - Delete row, filter by status (All, In progress, Done), and real-time % completion progress bar.

5. **SMART Goals Worksheet** (`/smart-goals`):
   - Individual worksheets per goal with quick worksheet tab selector.
   - Fields: Goal, Purpose, Challenges.
   - **S-M-A-R-T Checklist**: Specific (S), Measurable (M), Achievable (A), Reason (R), Time-Bound (T) with live **SMART Score (0–5)**.
   - **Completion Date**: Countdown badge showing "X days left" or "X days overdue".
   - **Key Steps**: Table with Description, Starting Date, Finishing Date, and Done checkbox.
   - **Milestones Log**: Date + Measure pairs with an interactive progress trajectory line chart.
   - **"Add to Goal Tracker"** button.

6. **Promotion Plans** (`/promotion`):
   - Multiple campaign plans per user.
   - **Objective** large text box.
   - Table: `SL No | Plan of Action | Responsibility | Budget (₹) | Deadline`.
   - Live total budget tally at the bottom.
   - **Deadline alerts**: Turns amber when due in ≤ 3 days, and red when overdue.

7. **Management Systems** (`/management`):
   - Three dedicated tabs stored under a unified `type` column:
     - **System Management System**
     - **Service Management System**
     - **Sales Management System**
   - Table: `CHALLENGE | REASON | SOLUTION | STATUS`.
   - Real-time keyword search box and Open/Solved filter.
   - One-click status toggle between `Open` and `Solved`.

8. **Profile & Settings** (`/settings`):
   - Executive profile (Name, Business Name, Phone, Timezone, Logo URL).
   - Customizable labels for the 4 Daily Checks and 4 Time Audit slots.
   - Daily morning reminder time preferences.
   - **Data Backup & Export**: Download full JSON backup and export Goals to CSV.

9. **Admin Panel** (`/admin`):
   - Accessible to users with `is_admin = true`.
   - Total users count, active accounts, timezone distribution, and CSV export.
   - **Strict Privacy Guard**: Admin can never read diary content (Postgres RLS enforced).

---

## ⚡ Autosave & PWA Architecture

- **Autosave Engine**: Every single input field saves automatically with an 800 ms debounce.
- **Save Indicator**: A discrete pill in the top header displays **"Saved ✓"**, **"Saving..."**, or **"Offline (queued)"**. No manual save buttons are needed.
- **PWA & Offline Tolerant**: Works offline on phones, caches assets via Service Worker (`vite-plugin-pwa`), and queues edits for background sync upon reconnection.
- **Print / PDF**: Every page features a **"Print / Download PDF"** button using `@media print` rules tailored for physical A4/A5 paper reproduction.

---

## 🛡️ Multi-User Isolation & Security

The app is built to guarantee that **one user can never see another user's data**:
1. When connected to Supabase, Postgres **Row Level Security (RLS)** restricts all queries to `auth.uid() = user_id`.
2. For instant offline or local evaluation, the built-in storage engine partitions data strictly by `user_id`.
3. When `VITE_DEV_TOOLS=true`, use the **Dev Accounts** switcher in the sidebar to alternate between:
   - **User 1 (CEO)**: `Aravind Krishnan`
   - **User 2 (Sales Lead)**: `Meera Sundaram`
   - **Admin Account**: `System Administrator`
Confirm that modifying to-dos, priorities, or goals in User 1 leaves User 2 completely isolated and untouched.

---

## 🛠️ Quick Start & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase project keys:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_DEV_TOOLS=false
```
*(Note: If left blank or in offline mode, the app automatically runs in instant demo mode with full per-user data isolation!)*

### 3. Apply Supabase Database Migrations
If using a live Supabase backend:
1. Open your Supabase Dashboard > **SQL Editor**.
2. Run the migration script located at:
   `supabase/migrations/01_initial_schema.sql`
3. This creates all 12 tables, sets up foreign key cascades, triggers, performance indexes, and enables RLS policies.

### 4. Start Development Server
```bash
npm run dev
```

### 5. Build for Production & PWA
```bash
npm run build
```
Preview the production build:
```bash
npm run preview
```

---

## 🚢 Deployment

This is a standard Vite SPA:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_DEV_TOOLS=false`.
- **Hosting Platforms**: Vercel, Netlify, Cloudflare Pages, Firebase Hosting, or any static web host.

---

## 📄 License & Attribution
Designed for business executives and leaders practicing the *1% Daily Improvement* philosophy.  
IdeaPlus Business Systems © 2026. All rights reserved.
