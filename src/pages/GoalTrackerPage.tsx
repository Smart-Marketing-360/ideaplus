import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  Plus,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  CircleDashed,
  Megaphone
} from 'lucide-react';
import { DiaryPageFrame } from '../components/layout/DiaryPageFrame';
import { useAuth } from '../context/AuthContext';
import { useAutosave } from '../context/AutosaveContext';
import { getGoals, saveGoal, deleteGoal, getPromotionPlans } from '../lib/dataService';
import { Goal, GoalStatus, PromotionPlan } from '../types/database';

// Auto-resizing textarea that expands seamlessly with content (never scrollbars or text clipping)
const AutoResizingTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 40)}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-transparent focus:outline-none resize-none leading-snug py-1 overflow-hidden transition-all ${className || ''}`}
    />
  );
};

export const GoalTrackerPage: React.FC = () => {
  const { user } = useAuth();
  const { triggerSave } = useAutosave();
  const navigate = useNavigate();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [promotionPlans, setPromotionPlans] = useState<PromotionPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'not_started' | 'in_progress' | 'done'>('all');

  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [goalsData, promoData] = await Promise.all([
          getGoals(user!.id),
          getPromotionPlans(user!.id)
        ]);
        if (!isCancelled) {
          setGoals(goalsData);
          setPromotionPlans(promoData.plans);
        }
      } catch (err) {
        console.error('Failed to load goals & promo plans:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  // Update a single goal row
  const handleUpdateGoal = (id: string, updates: Partial<Goal>) => {
    const updated = goals.map((g) => (g.id === id ? { ...g, ...updates } : g));
    setGoals(updated);
    const target = updated.find((g) => g.id === id);
    if (target && user) {
      triggerSave(() => saveGoal(user.id, target));
    }
  };

  // 3-state circle toggle: 0 -> 1 -> 2 -> 0
  const cycleStatus = (id: string, current: GoalStatus) => {
    const nextStatus: GoalStatus = current === 0 ? 1 : current === 1 ? 2 : 0;
    handleUpdateGoal(id, { status: nextStatus });
  };

  // Add new goal row
  const handleAddGoal = async () => {
    if (!user) return;
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      user_id: user.id,
      goal: '',
      result_indicator: '',
      action_plan: '',
      todo: '',
      status: 0,
      sort_order: goals.length,
    };
    const updated = [...goals, newGoal];
    setGoals(updated);
    triggerSave(() => saveGoal(user.id, newGoal));
  };

  // Delete goal
  const handleDeleteGoal = async (id: string) => {
    if (!user) return;
    const updated = goals.filter((g) => g.id !== id);
    setGoals(updated);
    triggerSave(() => deleteGoal(user.id, id));
  };

  // Progress metrics
  const totalCount = goals.length;
  const doneCount = goals.filter((g) => g.status === 2).length;
  const inProgressCount = goals.filter((g) => g.status === 1).length;
  const percentDone = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Filtered goals
  const filteredGoals = goals.filter((g) => {
    if (filter === 'not_started') return g.status === 0;
    if (filter === 'in_progress') return g.status === 1;
    if (filter === 'done') return g.status === 2;
    return true;
  });

  return (
    <DiaryPageFrame title="Goal tracker" subtitle="Master strategic action register">
      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-3 border-diary-gold border-t-diary-navy rounded-full animate-spin mb-3" />
          <p className="font-heading text-card-title text-diary-navy">Loading goals...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* PROGRESS BAR & STATUS SUMMARY CARD */}
          <div className="diary-card p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-diary-navy" />
                <h2 className="font-heading text-card-title text-diary-navy">
                  Overall goals progress
                </h2>
              </div>
              <div className="flex items-center gap-2.5 text-caption font-medium">
                <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
                  Done: {doneCount}
                </span>
                <span className="text-diary-navy bg-diary-gold/25 px-2 py-0.5 rounded font-semibold border border-diary-gold/30">
                  In progress: {inProgressCount}
                </span>
                <span className="text-diary-navy/80 bg-diary-cream-light px-2 py-0.5 rounded border border-diary-navy/20 font-medium">
                  Total: {totalCount}
                </span>
                <span className="text-card-title font-heading font-bold text-diary-navy ml-1 tabular-nums">
                  {percentDone}%
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2.5 bg-diary-cream rounded-full overflow-hidden border border-diary-navy/20 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-diary-gold to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${percentDone}%` }}
              />
            </div>
          </div>

          {/* FILTER & ADD CONTROLS STRIP */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-full overflow-x-auto pb-1 sm:pb-0">
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-diary-navy/20 text-caption font-medium shadow-xs whitespace-nowrap min-w-max">
                <span className="text-diary-navy/60 px-2 flex items-center gap-1 font-semibold">
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </span>
                {(['all', 'not_started', 'in_progress', 'done'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`px-3 py-1.5 rounded-md transition-colors min-h-[36px] font-semibold text-xs sm:text-caption ${
                      filter === key
                        ? 'bg-diary-navy text-white shadow-xs'
                        : 'text-diary-navy/70 hover:bg-diary-cream-light'
                    }`}
                  >
                    {key === 'all'
                      ? 'All goals'
                      : key === 'not_started'
                      ? 'Not started'
                      : key === 'in_progress'
                      ? 'In progress'
                      : 'Done'}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddGoal}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-diary-navy hover:bg-diary-navy-dark text-white rounded-lg text-body-medium font-semibold transition-colors shadow-xs min-h-[44px] active:scale-95 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 text-diary-gold" />
              <span>Add goal</span>
            </button>
          </div>

          {/* DESKTOP / TABLET LANDSCAPE SPREADSHEET TABLE */}
          <div className="hidden md:block diary-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="diary-table min-w-[900px]">
                <thead>
                  <tr>
                    <th className="w-12 text-center">#</th>
                    <th className="min-w-[220px] text-left">Goal</th>
                    <th className="min-w-[170px] text-left">Result indicator</th>
                    <th className="min-w-[220px] text-left">Action plan</th>
                    <th className="min-w-[170px] text-left">To-do</th>
                    <th className="w-32 text-center">Status</th>
                    <th className="w-16 no-print text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGoals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 bg-white">
                        No goals found matching the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredGoals.map((g, index) => (
                      <tr key={g.id}>
                        <td className="text-center font-heading font-semibold text-diary-navy text-caption">
                          {index + 1}
                        </td>
                        <td>
                          <AutoResizingTextarea
                            value={g.goal}
                            onChange={(val) => handleUpdateGoal(g.id, { goal: val })}
                            placeholder="Strategic goal..."
                            className="text-body-medium font-semibold text-diary-text"
                          />
                          {(() => {
                            const linkedPlans = promotionPlans.filter((p) => p.linked_goal_id === g.id);
                            if (linkedPlans.length === 0) return null;
                            return (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {linkedPlans.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => navigate('/promotion')}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-diary-navy bg-diary-cream hover:bg-diary-cream-dark px-2 py-0.5 rounded-md border border-diary-navy/20 transition-all shadow-2xs"
                                    title="View linked Promotion Campaign"
                                  >
                                    <Megaphone className="w-3 h-3 text-diary-navy" />
                                    <span>Campaign: {p.title || 'Untitled'}</span>
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          <AutoResizingTextarea
                            value={g.result_indicator}
                            onChange={(val) => handleUpdateGoal(g.id, { result_indicator: val })}
                            placeholder="Metric / indicator..."
                            className="text-body-default text-diary-text"
                          />
                        </td>
                        <td>
                          <AutoResizingTextarea
                            value={g.action_plan}
                            onChange={(val) => handleUpdateGoal(g.id, { action_plan: val })}
                            placeholder="Roadmap / plan..."
                            className="text-body-default text-diary-text"
                          />
                        </td>
                        <td>
                          <AutoResizingTextarea
                            value={g.todo}
                            onChange={(val) => handleUpdateGoal(g.id, { todo: val })}
                            placeholder="Immediate actions..."
                            className="text-body-default text-diary-text"
                          />
                        </td>
                        <td className="text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => cycleStatus(g.id, g.status)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-medium border transition-all"
                            style={{
                              backgroundColor:
                                g.status === 2 ? '#ECFDF5' : g.status === 1 ? '#FFFBEB' : '#F8FAFC',
                              borderColor:
                                g.status === 2 ? '#A7F3D0' : g.status === 1 ? '#FDE68A' : '#E2E8F0',
                              color:
                                g.status === 2 ? '#065F46' : g.status === 1 ? '#92400E' : '#475569',
                            }}
                            title="Click to toggle status"
                          >
                            {g.status === 0 && (
                              <>
                                <CircleDashed className="w-3.5 h-3.5 text-slate-400" />
                                <span>Not started</span>
                              </>
                            )}
                            {g.status === 1 && (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-600 fill-amber-100" />
                                <span>In progress</span>
                              </>
                            )}
                            {g.status === 2 && (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                                <span>Done</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="no-print text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteGoal(g.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors min-w-[36px] min-h-[36px] inline-flex items-center justify-center"
                            title="Delete goal"
                            aria-label="Delete goal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE STACKED CARDS (below 768px) */}
          <div className="md:hidden space-y-4">
            {filteredGoals.map((g, index) => (
              <div key={g.id} className="diary-card p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-diary-navy/10">
                  <span className="font-heading font-semibold text-card-title text-diary-navy">
                    Goal #{index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => cycleStatus(g.id, g.status)}
                      className="px-2.5 py-1 rounded-full text-caption font-bold border"
                      style={{
                        backgroundColor:
                          g.status === 2 ? '#ECFDF5' : g.status === 1 ? '#FFFBEB' : '#F8FAFC',
                        borderColor:
                          g.status === 2 ? '#A7F3D0' : g.status === 1 ? '#FDE68A' : '#CBD5E1',
                        color:
                          g.status === 2 ? '#065F46' : g.status === 1 ? '#92400E' : '#2A3B6B',
                      }}
                    >
                      {g.status === 2 ? 'Done' : g.status === 1 ? 'In progress' : 'Not started'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(g.id)}
                      className="text-diary-navy/40 hover:text-red-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
                      aria-label="Delete goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-tag font-semibold uppercase text-diary-navy/60 block mb-1">
                    Goal
                  </label>
                  <input
                    type="text"
                    value={g.goal}
                    onChange={(e) => handleUpdateGoal(g.id, { goal: e.target.value })}
                    placeholder="Enter goal..."
                    className="w-full p-2.5 bg-diary-cream-light/40 rounded-lg border border-diary-navy/20 text-body-medium font-semibold text-diary-text focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-tag font-semibold uppercase text-diary-navy/60 block mb-1">
                    Result indicator
                  </label>
                  <input
                    type="text"
                    value={g.result_indicator}
                    onChange={(e) => handleUpdateGoal(g.id, { result_indicator: e.target.value })}
                    placeholder="Measurable metric..."
                    className="w-full p-2 bg-diary-cream-light/30 rounded-lg border border-diary-navy/20 text-body-default text-diary-text focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-tag font-semibold uppercase text-diary-navy/60 block mb-1">
                    Action plan
                  </label>
                  <input
                    type="text"
                    value={g.action_plan}
                    onChange={(e) => handleUpdateGoal(g.id, { action_plan: e.target.value })}
                    placeholder="Strategic plan..."
                    className="w-full p-2 bg-diary-cream-light/30 rounded-lg border border-diary-navy/20 text-body-default text-diary-text focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-tag font-semibold uppercase text-diary-navy/60 block mb-1">
                    To-do
                  </label>
                  <input
                    type="text"
                    value={g.todo}
                    onChange={(e) => handleUpdateGoal(g.id, { todo: e.target.value })}
                    placeholder="Immediate task..."
                    className="w-full p-2 bg-diary-cream-light/30 rounded-lg border border-diary-navy/20 text-body-default text-diary-text focus:outline-none focus:bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DiaryPageFrame>
  );
};
