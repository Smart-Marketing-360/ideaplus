import React, { useState, useEffect } from 'react';
import { getDaysInMonth, subMonths, addMonths } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  BarChart3,
  Copy,
  Sparkles,
  TrendingUp,
  FileCheck2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { DiaryPageFrame } from '../components/layout/DiaryPageFrame';
import { useAuth } from '../context/AuthContext';
import { useAutosave } from '../context/AutosaveContext';
import { getMonthlyReview, saveMonthlyReview } from '../lib/dataService';
import { MonthlyReview } from '../types/database';
import { formatINR } from '../lib/formatters';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MonthlyReviewPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { triggerSave } = useAutosave();

  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [loading, setLoading] = useState<boolean>(true);
  const [review, setReview] = useState<MonthlyReview | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  // Time Audit slots labels
  const slotLabels = profile?.time_audit_labels || [
    'Slot 1 (Morning)',
    'Slot 2 (Mid-Day)',
    'Slot 3 (Afternoon)',
    'Slot 4 (Evening)'
  ];

  // Load monthly review data
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await getMonthlyReview(user!.id, year, month);
        
        // Pre-fill from prior month if empty
        if (!data.progress_last_month) {
          const priorDate = subMonths(new Date(year, month - 1), 1);
          const priorYear = priorDate.getFullYear();
          const priorMonth = priorDate.getMonth() + 1;
          const priorData = await getMonthlyReview(user!.id, priorYear, priorMonth);
          if (priorData?.progress_this_month) {
            data.progress_last_month = priorData.progress_this_month;
          }
        }

        if (!isCancelled) {
          setReview(data);
        }
      } catch (err) {
        console.error('Failed to load monthly review:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [user?.id, year, month]);

  // Navigate months
  const handlePrevMonth = () => {
    const prev = subMonths(new Date(year, month - 1), 1);
    setYear(prev.getFullYear());
    setMonth(prev.getMonth() + 1);
  };

  const handleNextMonth = () => {
    const next = addMonths(new Date(year, month - 1), 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  };

  // Autosave update helper
  const updateReview = (updates: Partial<MonthlyReview>) => {
    if (!review || !user) return;
    const updated = { ...review, ...updates };
    setReview(updated);
    triggerSave(() => saveMonthlyReview(user.id, updated));
  };

  // Time Audit tick toggle for specific day (1-31) and slot (0-3)
  const toggleTimeAudit = (day: number, slotIndex: number) => {
    if (!review) return;
    const dayStr = String(day);
    const currentDayAudit = [...(review.time_audit?.[dayStr] || [false, false, false, false])];
    currentDayAudit[slotIndex] = !currentDayAudit[slotIndex];

    const updatedAudit = {
      ...(review.time_audit || {}),
      [dayStr]: currentDayAudit
    };

    updateReview({ time_audit: updatedAudit });
  };

  // Calculate total ticks in time audit
  const totalTicks = React.useMemo(() => {
    if (!review?.time_audit) return 0;
    let count = 0;
    Object.values(review.time_audit).forEach((arr) => {
      if (Array.isArray(arr)) {
        arr.forEach((v) => {
          if (v) count++;
        });
      }
    });
    return count;
  }, [review?.time_audit]);

  // Copy Next Month Goal to the upcoming month's goals
  const handleCopyToNextMonth = async () => {
    if (!review || !user || !review.next_month_goal.trim()) {
      setBannerMsg('No next month goal text to copy.');
      setTimeout(() => setBannerMsg(null), 3000);
      return;
    }

    const nextDate = addMonths(new Date(year, month - 1), 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = nextDate.getMonth() + 1;

    const nextMonthReview = await getMonthlyReview(user.id, nextYear, nextMonth);
    nextMonthReview.progress_last_month = review.next_month_goal;
    await saveMonthlyReview(user.id, nextMonthReview);

    setBannerMsg(`Copied to ${MONTH_NAMES[nextMonth - 1]} ${nextYear} "Progress from last month".`);
    setTimeout(() => setBannerMsg(null), 4000);
  };

  const daysInCurrentMonth = getDaysInMonth(new Date(year, month - 1));
  const daysArray = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);

  // Time bucket chart data with clean labels to avoid overlapping x-axis text
  const chartData = [
    { name: 'Planning', fullName: 'Goal planning', hours: Number(review?.hours_goal_planning) || 0, color: '#2A3B6B' },
    { name: 'Execution', fullName: 'Implementation', hours: Number(review?.hours_implementation) || 0, color: '#F2B230' },
    { name: 'Review', fullName: 'Review', hours: Number(review?.hours_review) || 0, color: '#3D528F' },
    { name: 'Innovation', fullName: 'Innovation', hours: Number(review?.hours_innovation) || 0, color: '#F8D176' },
    { name: 'Solution', fullName: 'Solution', hours: Number(review?.hours_solution) || 0, color: '#1B2647' },
  ];

  return (
    <DiaryPageFrame
      title="Monthly review"
      subtitle={`${MONTH_NAMES[month - 1]} ${year}`}
    >
      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-3 border-diary-gold border-t-diary-navy rounded-full animate-spin mb-3" />
          <p className="font-heading text-card-title text-diary-navy">Loading review...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Month Selector Bar */}
          <div className="diary-card p-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-11 h-11 rounded-lg border border-diary-navy/20 bg-white hover:bg-diary-cream-light text-diary-navy flex items-center justify-center transition-colors"
              title="Previous month"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <span className="font-heading text-section-title text-diary-navy font-bold">
                {MONTH_NAMES[month - 1]} {year}
              </span>
              <span className="text-caption font-bold text-diary-navy bg-diary-gold/25 px-2.5 py-0.5 rounded-full border border-diary-gold/40">
                {totalTicks} ticks logged
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-11 h-11 rounded-lg border border-diary-navy/20 bg-white hover:bg-diary-cream-light text-diary-navy flex items-center justify-center transition-colors"
              title="Next month"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Banner message */}
          {bannerMsg && (
            <div className="p-3.5 bg-diary-gold/15 border border-diary-gold/30 text-diary-navy text-body-default rounded-xl flex items-center gap-2 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-diary-gold-dark shrink-0" />
              <span className="font-semibold">{bannerMsg}</span>
            </div>
          )}

          {/* TIME AUDIT GRID & TIME BUCKETS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* TIME AUDIT GRID (LEFT STRIP) */}
            <div className="lg:col-span-5 diary-card p-4 md:p-6 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-diary-navy/10">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-diary-navy" />
                    <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                      Time audit grid
                    </h2>
                  </div>
                  <span className="text-caption text-diary-navy/60 font-medium">
                    Days 1 to {daysInCurrentMonth}
                  </span>
                </div>

                <div className="text-caption text-diary-navy/70 mb-3">
                  Tick the 4 focus intervals executed with high productivity.
                </div>

                {/* Grid Header with Cream background */}
                <div className="grid grid-cols-5 text-center text-tag font-bold uppercase text-diary-navy bg-diary-cream py-2 border border-diary-navy/20 rounded-t-lg">
                  <div>Day</div>
                  <div>S1</div>
                  <div>S2</div>
                  <div>S3</div>
                  <div>S4</div>
                </div>

                {/* Rows for days 1 to daysInMonth - Alternating Cream (#FAF4E7) and White */}
                <div className="max-h-[380px] overflow-y-auto border-x border-b border-diary-navy/20 divide-y divide-diary-navy/10 rounded-b-lg">
                  {daysArray.map((day) => {
                    const dayStr = String(day);
                    const dayTicks = review?.time_audit?.[dayStr] || [false, false, false, false];
                    return (
                      <div
                        key={day}
                        className={`grid grid-cols-5 items-center text-center py-1.5 text-caption ${
                          day % 2 === 0 ? 'bg-[#FAF4E7]' : 'bg-white'
                        }`}
                      >
                        <span className="font-heading font-semibold text-diary-navy tabular-nums">
                          {day < 10 ? `0${day}` : day}
                        </span>
                        {[0, 1, 2, 3].map((slotIdx) => (
                          <div key={slotIdx} className="flex justify-center">
                            <input
                              type="checkbox"
                              checked={Boolean(dayTicks[slotIdx])}
                              onChange={() => toggleTimeAudit(day, slotIdx)}
                              className="w-4 h-4 rounded text-diary-navy focus:ring-diary-gold cursor-pointer"
                              title={`${slotLabels[slotIdx]} - Day ${day}`}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Ticks Footer */}
              <div className="mt-4 p-3 bg-diary-cream-light rounded-lg border border-diary-navy/20 flex items-center justify-between gap-2">
                <span className="text-caption font-bold uppercase text-diary-navy">
                  Total focus ticks logged:
                </span>
                <span className="text-body-medium font-heading font-bold text-diary-navy tabular-nums bg-white px-2.5 py-1 rounded border border-diary-navy/20 shadow-2xs whitespace-nowrap shrink-0">
                  {totalTicks} / {daysInCurrentMonth * 4}
                </span>
              </div>
            </div>

            {/* TIME BUCKETS (RIGHT SIDE) & COMPARATIVE BAR CHART */}
            <div className="lg:col-span-7 diary-card p-4 md:p-6 flex flex-col justify-between min-w-0 overflow-hidden">
              <div className="min-w-0">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-diary-navy/10">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-diary-navy" />
                    <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                      Time allocation
                    </h2>
                  </div>
                  <span className="text-caption text-diary-navy/60 font-medium">
                    Hours & executive notes
                  </span>
                </div>

                {/* 5 Time Buckets - Responsive row with min-w-0 to prevent text leaking out */}
                <div className="space-y-2.5 min-w-0">
                  {[
                    { key: 'hours_goal_planning', noteKey: 'goal_planning', label: 'Goal planning time' },
                    { key: 'hours_implementation', noteKey: 'implementation', label: 'Implementation time' },
                    { key: 'hours_review', noteKey: 'review', label: 'Review time' },
                    { key: 'hours_innovation', noteKey: 'innovation', label: 'Innovation time' },
                    { key: 'hours_solution', noteKey: 'solution', label: 'Solution time' },
                  ].map((bucket) => {
                    const hoursVal = (review as any)?.[bucket.key] ?? 0;
                    const notesVal = review?.notes?.[bucket.noteKey as keyof typeof review.notes] ?? '';

                    return (
                      <div
                        key={bucket.key}
                        className="p-2.5 bg-diary-cream-light/50 rounded-lg border border-diary-navy/15 flex flex-col xl:flex-row xl:items-center gap-2 min-w-0 w-full"
                      >
                        <div className="flex items-center justify-between xl:justify-start gap-2 shrink-0 xl:w-60">
                          <label className="text-caption font-semibold text-diary-navy leading-none whitespace-nowrap">
                            {bucket.label}
                          </label>
                          <div className="w-20 shrink-0 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-diary-navy/20">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={hoursVal}
                              onChange={(e) => updateReview({ [bucket.key]: parseFloat(e.target.value) || 0 })}
                              className="w-full text-right font-heading font-semibold text-caption text-diary-navy focus:outline-none tabular-nums bg-transparent"
                            />
                            <span className="text-caption text-diary-navy/50 font-medium">h</span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 w-full">
                          <input
                            type="text"
                            value={notesVal}
                            onChange={(e) => {
                              const newNotes = { ...(review?.notes || {}), [bucket.noteKey]: e.target.value };
                              updateReview({ notes: newNotes });
                            }}
                            placeholder={`Notes on ${bucket.label.toLowerCase()}...`}
                            className="w-full min-w-0 bg-white text-caption px-2.5 py-1.5 rounded-md border border-diary-navy/20 focus:outline-none text-diary-text focus:border-diary-navy focus:ring-1 focus:ring-diary-navy/20"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COMPARATIVE BAR CHART */}
              <div className="mt-5 pt-4 border-t border-diary-navy/10 min-w-0">
                <div className="text-caption font-semibold text-diary-navy mb-2 flex items-center justify-between">
                  <span>Monthly time distribution</span>
                  <span className="text-caption text-diary-navy/70 font-semibold tabular-nums">
                    Total: {chartData.reduce((acc, curr) => acc + curr.hours, 0)} hrs
                  </span>
                </div>
                <div className="h-40 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#2A3B6B' }} interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: '#2A3B6B' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#2A3B6B',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px'
                        }}
                        formatter={(val: any, _name: any, item: any) => [
                          `${val} hrs`,
                          item.payload.fullName || item.payload.name
                        ]}
                      />
                      <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* RESULTS OF THE MONTH & SALARY FOR THE RESULTS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* RESULTS OF THE MONTH */}
            <div className="lg:col-span-8 diary-card p-4 md:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-diary-navy/10">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-diary-navy" />
                    <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                      Results of the month
                    </h2>
                  </div>
                  <span className="text-caption text-diary-navy/60 font-medium">
                    Operational & business milestones
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={review?.results || ''}
                  onChange={(e) => updateReview({ results: e.target.value })}
                  placeholder="Detail key accomplishments, revenue breakthroughs, system completions, and client wins..."
                  className="w-full p-3 rounded-lg bg-diary-cream-light/30 border border-diary-navy/20 text-body-default text-diary-text focus:outline-none focus:ring-1 focus:ring-diary-navy focus:bg-white resize-none"
                />
              </div>
            </div>

            {/* SALARY FOR THE RESULTS (Rs.) */}
            <div className="lg:col-span-4 diary-card p-4 md:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-diary-navy/10">
                  <div className="w-6 h-6 rounded-full bg-diary-navy text-diary-gold flex items-center justify-center font-bold text-xs shadow-xs">
                    ₹
                  </div>
                  <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                    Salary for results
                  </h2>
                </div>

                <p className="text-caption text-diary-navy/70 mb-3">
                  Evaluate your executive output value. What remuneration did your strategic results justify this month?
                </p>

                <div className="bg-diary-cream-light/40 p-3 rounded-lg border border-diary-navy/20">
                  <label className="text-tag uppercase text-diary-navy/70 font-semibold block mb-1">
                    Value generated (₹)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-card-title font-bold text-diary-navy">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={review?.salary_for_results || 0}
                      onChange={(e) => updateReview({ salary_for_results: parseFloat(e.target.value) || 0 })}
                      className="w-full font-heading font-bold text-card-title text-diary-navy focus:outline-none bg-transparent tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 p-2.5 bg-diary-cream-light rounded-lg text-center border border-diary-navy/15">
                <span className="text-caption text-diary-navy/70 font-medium block">
                  Formatted value:
                </span>
                <span className="text-card-title font-heading font-bold text-diary-navy tabular-nums">
                  {formatINR(review?.salary_for_results || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* GOAL TRACKING (2 COLUMNS) & NEXT MONTH GOAL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* GOAL TRACKING COMPARISON */}
            <div className="lg:col-span-7 diary-card p-4 md:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-diary-navy/10">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-diary-navy" />
                    <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                      Goal tracking comparison
                    </h2>
                  </div>
                  <span className="text-caption text-diary-navy/60 font-medium">
                    Month-over-month continuity
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Progress From Last Month */}
                  <div className="bg-diary-cream-light/40 p-3 rounded-lg border border-diary-navy/20">
                    <span className="text-caption font-bold text-diary-navy block mb-1.5">
                      Progress from last month
                    </span>
                    <textarea
                      rows={4}
                      value={review?.progress_last_month || ''}
                      onChange={(e) => updateReview({ progress_last_month: e.target.value })}
                      placeholder="Targets handed over from prior month review..."
                      className="w-full bg-white p-2.5 rounded-md border border-diary-navy/20 text-caption text-diary-text focus:outline-none resize-none"
                    />
                  </div>

                  {/* Progress This Month */}
                  <div className="bg-diary-cream-light/40 p-3 rounded-lg border border-diary-navy/20">
                    <span className="text-caption font-bold text-diary-navy block mb-1.5">
                      Progress this month
                    </span>
                    <textarea
                      rows={4}
                      value={review?.progress_this_month || ''}
                      onChange={(e) => updateReview({ progress_this_month: e.target.value })}
                      placeholder="Milestones reached during this 30-day review cycle..."
                      className="w-full bg-white p-2.5 rounded-md border border-diary-navy/20 text-caption text-diary-text focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* NEXT MONTH GOAL & COPY BUTTON */}
            <div className="lg:col-span-5 diary-card p-4 md:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-diary-navy/10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-diary-gold" />
                    <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                      Next month goal
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyToNextMonth}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-diary-cream hover:bg-diary-cream-dark text-diary-navy font-bold text-caption rounded-lg transition-colors border border-diary-navy/20 min-h-[36px]"
                    title="Copy to upcoming month's review goals"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy to next month</span>
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={review?.next_month_goal || ''}
                  onChange={(e) => updateReview({ next_month_goal: e.target.value })}
                  placeholder="Primary strategic objective for the coming month..."
                  className="w-full p-3 rounded-lg bg-diary-cream-light/30 border border-diary-navy/20 text-body-default text-diary-text focus:outline-none focus:ring-1 focus:ring-diary-navy focus:bg-white resize-none"
                />
              </div>

              <div className="mt-3 text-caption text-diary-navy/60 italic">
                Clicking "Copy to next month" automatically carries over this target.
              </div>
            </div>
          </div>
        </div>
      )}
    </DiaryPageFrame>
  );
};
