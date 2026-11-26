import React, { useState, useEffect } from 'react';
import { differenceInDays, parseISO, format } from 'date-fns';
import {
  Megaphone,
  Plus,
  Clock,
  AlertTriangle,
  Target,
  ArrowRight
} from 'lucide-react';
import { DiaryPageFrame } from '../components/layout/DiaryPageFrame';
import { useAuth } from '../context/AuthContext';
import { useAutosave } from '../context/AutosaveContext';
import {
  getPromotionPlans,
  savePromotionPlan,
  savePromotionPlanItems,
  getGoals
} from '../lib/dataService';
import { PromotionPlan, PromotionPlanItem, Goal } from '../types/database';
import { formatINR } from '../lib/formatters';

export const PromotionPlansPage: React.FC = () => {
  const { user } = useAuth();
  const { triggerSave } = useAutosave();

  const [loading, setLoading] = useState<boolean>(true);
  const [plans, setPlans] = useState<PromotionPlan[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<string, PromotionPlanItem[]>>({});

  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [promoData, goalsData] = await Promise.all([
          getPromotionPlans(user!.id),
          getGoals(user!.id)
        ]);
        if (!isCancelled) {
          setPlans(promoData.plans);
          setItemsMap(promoData.items);
          setGoals(goalsData);
          if (promoData.plans.length > 0 && !activePlanId) {
            setActivePlanId(promoData.plans[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load promotion plans & goals:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0] || null;
  const activeItems = activePlan ? itemsMap[activePlan.id] || [] : [];

  // Update active plan objective or title
  const handleUpdatePlan = (updates: Partial<PromotionPlan>) => {
    if (!activePlan || !user) return;
    const updated = { ...activePlan, ...updates };
    const updatedPlans = plans.map((p) => (p.id === activePlan.id ? updated : p));
    setPlans(updatedPlans);
    triggerSave(() => savePromotionPlan(user.id, updated));
  };

  // Update a specific table row
  const handleUpdateItem = (itemId: string, updates: Partial<PromotionPlanItem>) => {
    if (!activePlan || !user) return;
    const current = itemsMap[activePlan.id] || [];
    const updatedItems = current.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
    setItemsMap((prev) => ({ ...prev, [activePlan.id]: updatedItems }));
    triggerSave(() => savePromotionPlanItems(user.id, activePlan.id, updatedItems));
  };

  // Add more rows
  const handleAddItemRow = () => {
    if (!activePlan || !user) return;
    const current = itemsMap[activePlan.id] || [];
    const newItem: PromotionPlanItem = {
      id: crypto.randomUUID(),
      plan_id: activePlan.id,
      user_id: user.id,
      sl_no: current.length + 1,
      plan_of_action: '',
      responsibility: '',
      budget: 0,
      deadline: format(new Date(), 'yyyy-MM-dd')
    };
    const updatedItems = [...current, newItem];
    setItemsMap((prev) => ({ ...prev, [activePlan.id]: updatedItems }));
    triggerSave(() => savePromotionPlanItems(user.id, activePlan.id, updatedItems));
  };

  // Create new promotion plan
  const handleCreatePlan = async () => {
    if (!user) return;
    const newId = crypto.randomUUID();
    const newPlan: PromotionPlan = {
      id: newId,
      user_id: user.id,
      title: 'New promotion plan',
      objective: 'Outline primary growth, advertising and customer acquisition goals...'
    };

    const initialRows: PromotionPlanItem[] = Array.from({ length: 12 }, (_, i) => ({
      id: crypto.randomUUID(),
      plan_id: newId,
      user_id: user.id,
      sl_no: i + 1,
      plan_of_action: '',
      responsibility: '',
      budget: 0,
      deadline: format(new Date(), 'yyyy-MM-dd')
    }));

    const updatedPlans = [newPlan, ...plans];
    setPlans(updatedPlans);
    setItemsMap((prev) => ({ ...prev, [newId]: initialRows }));
    setActivePlanId(newId);

    triggerSave(async () => {
      await savePromotionPlan(user.id, newPlan);
      await savePromotionPlanItems(user.id, newId, initialRows);
    });
  };

  const totalBudget = activeItems.reduce((acc, curr) => acc + (Number(curr.budget) || 0), 0);

  const getDeadlineStatus = (deadlineStr?: string) => {
    if (!deadlineStr) return { status: 'normal', days: null };
    try {
      const days = differenceInDays(parseISO(deadlineStr), new Date());
      if (days < 0) return { status: 'overdue', days };
      if (days <= 3) return { status: 'due_soon', days };
      return { status: 'normal', days };
    } catch {
      return { status: 'normal', days: null };
    }
  };

  return (
    <DiaryPageFrame
      title="Promotion plans"
      subtitle={activePlan?.title || 'Marketing & growth campaigns'}
    >
      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-3 border-diary-gold border-t-diary-navy rounded-full animate-spin mb-3" />
          <p className="font-heading text-card-title text-diary-navy">Loading plans...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plan selector tabs & New Plan button */}
          <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePlanId(p.id)}
                  className={`px-3 py-2 rounded-lg text-body-medium transition-all whitespace-nowrap truncate max-w-[220px] min-h-[44px] ${
                    activePlan?.id === p.id
                      ? 'bg-diary-navy text-white font-bold shadow-xs'
                      : 'bg-white hover:bg-diary-cream-light border border-diary-navy/20 text-diary-navy font-medium'
                  }`}
                >
                  {p.title || 'Untitled plan'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCreatePlan}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-diary-navy hover:bg-diary-navy-dark text-white rounded-lg text-body-medium font-semibold transition-colors shadow-xs shrink-0 min-h-[44px] active:scale-95"
            >
              <Plus className="w-4 h-4 text-diary-gold" />
              <span>New plan</span>
            </button>
          </div>

          {!activePlan ? (
            <div className="diary-card py-16 text-center space-y-3">
              <p className="text-body-default text-diary-navy/70">No promotion plans logged yet.</p>
              <button
                type="button"
                onClick={handleCreatePlan}
                className="px-4 py-2 bg-diary-navy hover:bg-diary-navy-dark text-white font-semibold text-body-medium rounded-lg shadow-xs"
              >
                Create your first promotion plan
              </button>
            </div>
          ) : (
            <>
              {/* OBJECTIVE BLOCK */}
              <div className="diary-card p-4 md:p-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-diary-navy/10">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-diary-navy" />
                    <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                      Objective & campaign focus
                    </h2>
                  </div>
                  <input
                    type="text"
                    value={activePlan.title}
                    onChange={(e) => handleUpdatePlan({ title: e.target.value })}
                    placeholder="Plan title..."
                    className="font-heading font-semibold text-caption text-diary-navy px-2.5 py-1 bg-diary-cream-light rounded-lg border border-diary-navy/20 focus:outline-none"
                  />
                </div>

                <textarea
                  rows={3}
                  value={activePlan.objective}
                  onChange={(e) => handleUpdatePlan({ objective: e.target.value })}
                  placeholder="Define marketing targets, channels, conversion goals, and audience reach..."
                  className="w-full p-3 rounded-lg bg-diary-cream-light/30 border border-diary-navy/20 text-body-default text-diary-text focus:outline-none focus:ring-1 focus:ring-diary-navy focus:bg-white resize-none"
                />

                {/* EXPLICIT LINK TO STRATEGIC GOAL */}
                <div className="pt-3 border-t border-diary-navy/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-diary-cream-light/50 p-3 rounded-xl border border-diary-navy/15">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-diary-navy text-diary-gold flex items-center justify-center shrink-0 shadow-2xs">
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-tag font-bold uppercase text-diary-navy/70 tracking-wider">
                        Linked Strategic Goal
                      </div>
                      <div className="text-caption text-diary-navy/60 font-medium truncate">
                        Connect this promotion campaign directly to a company goal
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                    <select
                      value={activePlan.linked_goal_id || ''}
                      onChange={(e) => handleUpdatePlan({ linked_goal_id: e.target.value || null })}
                      className="w-full sm:w-auto text-caption sm:text-body-medium font-semibold px-3 py-2 rounded-lg bg-white border border-diary-navy/20 text-diary-navy focus:outline-none focus:ring-1 focus:ring-diary-navy cursor-pointer max-w-full sm:max-w-xs min-h-[38px] shadow-2xs"
                    >
                      <option value="">None (Standalone campaign)</option>
                      {goals.map((g) => {
                        const statusLabel = g.status === 2 ? 'Done' : g.status === 1 ? 'In progress' : 'Not started';
                        return (
                          <option key={g.id} value={g.id}>
                            {g.goal} ({statusLabel})
                          </option>
                        );
                      })}
                    </select>

                    {activePlan.linked_goal_id && (() => {
                      const matched = goals.find((g) => g.id === activePlan.linked_goal_id);
                      if (!matched) return null;
                      const statusLabel = matched.status === 2 ? 'Done' : matched.status === 1 ? 'In progress' : 'Not started';
                      return (
                        <span className="text-tag font-bold px-2.5 py-1 rounded-md bg-diary-gold/25 text-diary-navy border border-diary-gold/40 flex items-center gap-1 shadow-2xs">
                          <span>Status:</span>
                          <strong className="font-heading">{statusLabel}</strong>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* PROMOTION ACTION REGISTER TABLE */}
              <div className="diary-card p-4 md:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-diary-navy/10">
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                      Action register
                    </h2>
                    <span className="text-caption text-diary-navy/60 font-medium">
                      ({activeItems.length} action items)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-caption">
                    <span className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px] sm:text-caption">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Due in ≤3 days
                    </span>
                    <span className="flex items-center gap-1 text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200 text-[11px] sm:text-caption">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Overdue
                    </span>
                  </div>
                </div>

                {/* DESKTOP TABLE VIEW */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-diary-navy/20">
                  <table className="diary-table">
                    <thead>
                      <tr>
                        <th className="w-12 text-center">#</th>
                        <th className="text-left">Plan of action</th>
                        <th className="text-left w-44 sm:w-52">Responsibility</th>
                        <th className="w-32 text-right">Budget (₹)</th>
                        <th className="w-36 text-center">Deadline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeItems.map((item, idx) => {
                        const { status } = getDeadlineStatus(item.deadline);

                        return (
                          <tr key={item.id}>
                            <td className="text-center font-heading font-semibold text-diary-navy text-caption">
                              {idx + 1}
                            </td>

                            <td>
                              <input
                                type="text"
                                value={item.plan_of_action}
                                onChange={(e) => handleUpdateItem(item.id, { plan_of_action: e.target.value })}
                                placeholder={`Action item #${idx + 1}...`}
                                className="w-full bg-transparent focus:outline-none text-body-default text-diary-text px-1"
                              />
                            </td>

                            <td>
                              <input
                                type="text"
                                value={item.responsibility}
                                onChange={(e) => handleUpdateItem(item.id, { responsibility: e.target.value })}
                                placeholder="Person / team..."
                                className="w-full bg-transparent focus:outline-none text-body-default text-diary-text px-1"
                              />
                            </td>

                            <td className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-diary-navy/40 text-caption font-medium">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="500"
                                  value={item.budget || 0}
                                  onChange={(e) => handleUpdateItem(item.id, { budget: parseFloat(e.target.value) || 0 })}
                                  className="w-24 text-right font-heading font-semibold text-caption text-diary-navy bg-transparent focus:outline-none tabular-nums"
                                />
                              </div>
                            </td>

                            <td className="text-center">
                              <div
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-semibold border ${
                                  status === 'overdue'
                                    ? 'bg-red-50 text-red-800 border-red-200'
                                    : status === 'due_soon'
                                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                                    : 'bg-white text-diary-navy border-diary-navy/20'
                                }`}
                              >
                                {status === 'overdue' && (
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                )}
                                {status === 'due_soon' && (
                                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                )}
                                <input
                                  type="date"
                                  value={item.deadline || ''}
                                  onChange={(e) => handleUpdateItem(item.id, { deadline: e.target.value })}
                                  className="bg-transparent focus:outline-none cursor-pointer text-caption"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-diary-cream border-t-2 border-diary-navy/20">
                        <td colSpan={3} className="text-right font-heading font-bold text-diary-navy py-2.5 px-3 text-caption">
                          Total budget allocated:
                        </td>
                        <td className="text-right font-heading font-bold text-card-title text-diary-navy py-2.5 px-3 tabular-nums">
                          {formatINR(totalBudget)}
                        </td>
                        <td className="text-center text-caption text-diary-navy/70 font-semibold py-2.5">
                          {activeItems.filter((i) => getDeadlineStatus(i.deadline).status === 'overdue').length}{' '}
                          overdue
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* MOBILE STACKED CARDS VIEW (<md) */}
                <div className="md:hidden space-y-3">
                  {activeItems.map((item, idx) => {
                    const { status } = getDeadlineStatus(item.deadline);

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 bg-diary-cream-light/40 rounded-xl border border-diary-navy/15 space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-heading font-bold text-diary-navy text-caption px-2 py-0.5 bg-diary-cream rounded border border-diary-navy/15">
                            Action #{idx + 1}
                          </span>
                          <div
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                              status === 'overdue'
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : status === 'due_soon'
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : 'bg-white text-diary-navy border-diary-navy/20'
                            }`}
                          >
                            {status === 'overdue' && (
                              <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                            )}
                            {status === 'due_soon' && (
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            )}
                            <input
                              type="date"
                              value={item.deadline || ''}
                              onChange={(e) => handleUpdateItem(item.id, { deadline: e.target.value })}
                              className="bg-transparent focus:outline-none cursor-pointer text-[11px]"
                            />
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={item.plan_of_action}
                            onChange={(e) => handleUpdateItem(item.id, { plan_of_action: e.target.value })}
                            placeholder={`Action item #${idx + 1}...`}
                            className="w-full p-2.5 bg-white rounded-lg border border-diary-navy/20 text-body-medium text-diary-text focus:outline-none focus:ring-1 focus:ring-diary-navy min-h-[44px]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-tag uppercase text-diary-navy/60 font-semibold block mb-0.5">
                              Owner
                            </label>
                            <input
                              type="text"
                              value={item.responsibility}
                              onChange={(e) => handleUpdateItem(item.id, { responsibility: e.target.value })}
                              placeholder="Person / team..."
                              className="w-full p-2 bg-white rounded-lg border border-diary-navy/20 text-caption text-diary-text focus:outline-none min-h-[38px]"
                            />
                          </div>
                          <div>
                            <label className="text-tag uppercase text-diary-navy/60 font-semibold block mb-0.5">
                              Budget (₹)
                            </label>
                            <div className="flex items-center bg-white rounded-lg border border-diary-navy/20 px-2 min-h-[38px]">
                              <span className="text-diary-navy/40 text-caption font-medium mr-1">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="500"
                                value={item.budget || 0}
                                onChange={(e) => handleUpdateItem(item.id, { budget: parseFloat(e.target.value) || 0 })}
                                className="w-full text-right font-heading font-semibold text-caption text-diary-navy bg-transparent focus:outline-none tabular-nums"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Mobile Budget Summary */}
                  <div className="p-3 bg-diary-cream rounded-xl border border-diary-navy/20 flex items-center justify-between">
                    <span className="text-caption font-heading font-bold text-diary-navy">
                      Total budget allocated:
                    </span>
                    <span className="text-body-medium font-heading font-bold text-diary-navy tabular-nums">
                      {formatINR(totalBudget)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="w-full py-2.5 border border-dashed border-diary-navy/30 rounded-lg text-body-medium font-semibold text-diary-navy hover:bg-diary-cream-light flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
                >
                  <Plus className="w-4 h-4 text-diary-navy" />
                  <span>Add action row</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </DiaryPageFrame>
  );
};
