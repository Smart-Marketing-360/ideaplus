import React, { useState, useEffect } from 'react';
import { differenceInDays, parseISO, format } from 'date-fns';
import {
  Sparkles,
  Plus,
  Trash2,
  Calendar,
  CheckSquare,
  Square,
  TrendingUp,
  Target,
  ListOrdered
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { DiaryPageFrame } from '../components/layout/DiaryPageFrame';
import { useAuth } from '../context/AuthContext';
import { useAutosave } from '../context/AutosaveContext';
import {
  getSmartGoals,
  saveSmartGoal,
  deleteSmartGoal,
  saveSmartGoalSteps,
  saveSmartGoalMilestones,
  saveGoal
} from '../lib/dataService';
import { SmartGoal, SmartGoalStep, SmartGoalMilestone, Goal } from '../types/database';

export const SmartGoalsPage: React.FC = () => {
  const { user } = useAuth();
  const { triggerSave } = useAutosave();

  const [loading, setLoading] = useState<boolean>(true);
  const [smartGoals, setSmartGoals] = useState<SmartGoal[]>([]);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [stepsMap, setStepsMap] = useState<Record<string, SmartGoalStep[]>>({});
  const [milestonesMap, setMilestonesMap] = useState<Record<string, SmartGoalMilestone[]>>({});
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);

  // Load SMART goals
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await getSmartGoals(user!.id);
        if (!isCancelled) {
          setSmartGoals(data.smartGoals);
          setStepsMap(data.steps);
          setMilestonesMap(data.milestones);
          if (data.smartGoals.length > 0 && !activeGoalId) {
            setActiveGoalId(data.smartGoals[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load SMART goals:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  const activeGoal = smartGoals.find((g) => g.id === activeGoalId) || smartGoals[0] || null;
  const activeSteps = activeGoal ? stepsMap[activeGoal.id] || [] : [];
  const activeMilestones = activeGoal ? milestonesMap[activeGoal.id] || [] : [];

  // Update active goal fields
  const handleUpdateActiveGoal = (updates: Partial<SmartGoal>) => {
    if (!activeGoal || !user) return;
    const updated = { ...activeGoal, ...updates };
    const updatedList = smartGoals.map((g) => (g.id === activeGoal.id ? updated : g));
    setSmartGoals(updatedList);
    triggerSave(() => saveSmartGoal(user.id, updated));
  };

  // Add new worksheet
  const handleCreateNewWorksheet = async () => {
    if (!user) return;
    const newId = crypto.randomUUID();
    const newGoal: SmartGoal = {
      id: newId,
      user_id: user.id,
      goal: 'New strategic SMART objective',
      purpose: '',
      challenges: '',
      is_specific: false,
      is_measurable: false,
      is_achievable: false,
      is_reason: false,
      is_timebound: false,
      completion_date: format(new Date(), 'yyyy-MM-dd')
    };

    const initialSteps: SmartGoalStep[] = Array.from({ length: 7 }, (_, i) => ({
      id: crypto.randomUUID(),
      smart_goal_id: newId,
      user_id: user.id,
      description: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      finish_date: format(new Date(), 'yyyy-MM-dd'),
      done: false,
      sort_order: i
    }));

    const initialMilestone: SmartGoalMilestone[] = [
      { id: crypto.randomUUID(), smart_goal_id: newId, user_id: user.id, date: format(new Date(), 'yyyy-MM-dd'), measure: 0, note: 'Start' }
    ];

    const updatedList = [newGoal, ...smartGoals];
    setSmartGoals(updatedList);
    setStepsMap((prev) => ({ ...prev, [newId]: initialSteps }));
    setMilestonesMap((prev) => ({ ...prev, [newId]: initialMilestone }));
    setActiveGoalId(newId);

    triggerSave(async () => {
      await saveSmartGoal(user.id, newGoal);
      await saveSmartGoalSteps(user.id, newId, initialSteps);
      await saveSmartGoalMilestones(user.id, newId, initialMilestone);
    });
  };

  // Delete current worksheet
  const handleDeleteActiveWorksheet = async () => {
    if (!activeGoal || !user) return;
    const goalId = activeGoal.id;
    const updatedList = smartGoals.filter((g) => g.id !== goalId);
    setSmartGoals(updatedList);
    setActiveGoalId(updatedList.length > 0 ? updatedList[0].id : null);
    triggerSave(() => deleteSmartGoal(user.id, goalId));
  };

  // Steps updates
  const handleUpdateStep = (stepId: string, updates: Partial<SmartGoalStep>) => {
    if (!activeGoal || !user) return;
    const currentSteps = stepsMap[activeGoal.id] || [];
    const updatedSteps = currentSteps.map((s) => (s.id === stepId ? { ...s, ...updates } : s));
    setStepsMap((prev) => ({ ...prev, [activeGoal.id]: updatedSteps }));
    triggerSave(() => saveSmartGoalSteps(user.id, activeGoal.id, updatedSteps));
  };

  const handleAddStepRow = () => {
    if (!activeGoal || !user) return;
    const currentSteps = stepsMap[activeGoal.id] || [];
    const newStep: SmartGoalStep = {
      id: crypto.randomUUID(),
      smart_goal_id: activeGoal.id,
      user_id: user.id,
      description: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      finish_date: format(new Date(), 'yyyy-MM-dd'),
      done: false,
      sort_order: currentSteps.length
    };
    const updatedSteps = [...currentSteps, newStep];
    setStepsMap((prev) => ({ ...prev, [activeGoal.id]: updatedSteps }));
    triggerSave(() => saveSmartGoalSteps(user.id, activeGoal.id, updatedSteps));
  };

  // Milestones updates
  const handleUpdateMilestone = (mileId: string, updates: Partial<SmartGoalMilestone>) => {
    if (!activeGoal || !user) return;
    const currentMiles = milestonesMap[activeGoal.id] || [];
    const updatedMiles = currentMiles.map((m) => (m.id === mileId ? { ...m, ...updates } : m));
    setMilestonesMap((prev) => ({ ...prev, [activeGoal.id]: updatedMiles }));
    triggerSave(() => saveSmartGoalMilestones(user.id, activeGoal.id, updatedMiles));
  };

  const handleAddMilestone = () => {
    if (!activeGoal || !user) return;
    const currentMiles = milestonesMap[activeGoal.id] || [];
    const newMile: SmartGoalMilestone = {
      id: crypto.randomUUID(),
      smart_goal_id: activeGoal.id,
      user_id: user.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      measure: 0,
      note: ''
    };
    const updatedMiles = [...currentMiles, newMile];
    setMilestonesMap((prev) => ({ ...prev, [activeGoal.id]: updatedMiles }));
    triggerSave(() => saveSmartGoalMilestones(user.id, activeGoal.id, updatedMiles));
  };

  const handleDeleteMilestone = (mileId: string) => {
    if (!activeGoal || !user) return;
    const currentMiles = milestonesMap[activeGoal.id] || [];
    const updatedMiles = currentMiles.filter((m) => m.id !== mileId);
    setMilestonesMap((prev) => ({ ...prev, [activeGoal.id]: updatedMiles }));
    triggerSave(() => saveSmartGoalMilestones(user.id, activeGoal.id, updatedMiles));
  };

  // Add to Goal Tracker button
  const handleAddToGoalTracker = async () => {
    if (!activeGoal || !user) return;
    const newGoalRow: Goal = {
      id: crypto.randomUUID(),
      user_id: user.id,
      goal: activeGoal.goal,
      result_indicator: `SMART Target (${smartScore}/5) due ${activeGoal.completion_date}`,
      action_plan: activeGoal.purpose,
      todo: activeSteps.find((s) => !s.done)?.description || 'Execute key milestone step',
      status: 1,
      sort_order: 0
    };
    await saveGoal(user.id, newGoalRow);
    setNotifyMsg('Goal added to master goal tracker.');
    setTimeout(() => setNotifyMsg(null), 3500);
  };

  // Calculate SMART score (0-5)
  const smartScore = activeGoal
    ? [
        activeGoal.is_specific,
        activeGoal.is_measurable,
        activeGoal.is_achievable,
        activeGoal.is_reason,
        activeGoal.is_timebound
      ].filter(Boolean).length
    : 0;

  // Countdown days left
  const daysLeft = activeGoal?.completion_date
    ? differenceInDays(parseISO(activeGoal.completion_date), new Date())
    : 0;

  // Milestones line chart data (sequential and chronological)
  const chartData = (activeMilestones || [])
    .slice()
    .sort((a, b) => {
      if (a.date !== b.date) return a.date > b.date ? 1 : -1;
      return 0;
    })
    .map((m, idx) => ({
      pointLabel: `#${idx + 1} (${m.date.length >= 10 ? m.date.slice(5) : m.date})`,
      date: m.date,
      measure: Number(m.measure) || 0,
      note: m.note || `Measure #${idx + 1}`
    }));

  return (
    <DiaryPageFrame
      title="SMART goals"
      subtitle={activeGoal?.goal || 'Worksheet planning register'}
    >
      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-3 border-diary-gold border-t-diary-navy rounded-full animate-spin mb-3" />
          <p className="font-heading text-card-title text-diary-navy">Loading worksheet...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Notification banner */}
          {notifyMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-body-default rounded-xl flex items-center gap-2 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{notifyMsg}</span>
            </div>
          )}

          {/* WORKSHEET SELECTOR TABS & NEW BUTTON */}
          <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {smartGoals.map((g, idx) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveGoalId(g.id)}
                  className={`px-3 py-2 rounded-lg text-body-medium transition-all whitespace-nowrap truncate max-w-[220px] min-h-[44px] ${
                    activeGoal?.id === g.id
                      ? 'bg-diary-navy text-white font-bold shadow-xs'
                      : 'bg-white hover:bg-diary-cream-light border border-diary-navy/20 text-diary-navy font-semibold'
                  }`}
                >
                  #{idx + 1} {g.goal || 'Untitled goal'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCreateNewWorksheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-diary-navy hover:bg-diary-navy-dark text-white rounded-lg text-body-medium font-semibold transition-colors shadow-xs shrink-0 min-h-[44px] active:scale-95"
            >
              <Plus className="w-4 h-4 text-diary-gold" />
              <span>New worksheet</span>
            </button>
          </div>

          {!activeGoal ? (
            <div className="diary-card py-16 text-center space-y-3">
              <p className="text-body-default text-diary-navy/70">No SMART worksheets created yet.</p>
              <button
                type="button"
                onClick={handleCreateNewWorksheet}
                className="px-4 py-2 bg-diary-navy hover:bg-diary-navy-dark text-white font-semibold text-body-medium rounded-lg shadow-xs"
              >
                Create your first SMART worksheet
              </button>
            </div>
          ) : (
            <>
              {/* WORKSHEET DEFINITION CARD */}
              <div className="diary-card p-4 md:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-diary-navy/10">
                  <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                    Worksheet definition
                  </h2>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddToGoalTracker}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-diary-cream hover:bg-diary-cream-dark text-diary-navy rounded-lg text-caption font-bold transition-colors border border-diary-navy/20 min-h-[36px]"
                    >
                      <Target className="w-3.5 h-3.5 text-diary-navy" />
                      <span>Add to goal tracker</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteActiveWorksheet}
                      className="p-1.5 text-diary-navy/40 hover:text-red-600 rounded transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                      title="Delete worksheet"
                      aria-label="Delete worksheet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* GOAL INPUT */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                    <label className="text-caption font-bold text-diary-navy">
                      Goal
                    </label>
                    <span className="text-caption text-diary-navy/60">
                      Be specific, concise, and measurable with a timeframe.
                    </span>
                  </div>
                  <input
                    type="text"
                    value={activeGoal.goal}
                    onChange={(e) => handleUpdateActiveGoal({ goal: e.target.value })}
                    placeholder="Enter specific goal..."
                    className="w-full p-2.5 bg-diary-cream-light/30 rounded-lg border border-diary-navy/20 text-body-medium font-semibold text-diary-navy focus:outline-none focus:ring-1 focus:ring-diary-navy focus:bg-white"
                  />
                </div>

                {/* PURPOSE & CHALLENGES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-caption font-bold text-diary-navy block mb-1">
                      Purpose
                    </label>
                    <textarea
                      rows={3}
                      value={activeGoal.purpose}
                      onChange={(e) => handleUpdateActiveGoal({ purpose: e.target.value })}
                      placeholder="Why is this goal relevant? What are the key benefits?"
                      className="w-full p-2.5 bg-diary-cream-light/30 rounded-lg border border-diary-navy/20 text-body-default text-diary-text focus:outline-none focus:bg-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-caption font-bold text-diary-navy block mb-1">
                      Challenges
                    </label>
                    <textarea
                      rows={3}
                      value={activeGoal.challenges}
                      onChange={(e) => handleUpdateActiveGoal({ challenges: e.target.value })}
                      placeholder="What obstacles must be overcome? What resources are needed?"
                      className="w-full p-2.5 bg-diary-cream-light/30 rounded-lg border border-diary-navy/20 text-body-default text-diary-text focus:outline-none focus:bg-white resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* SMART CHECKLIST & COMPLETION COUNTDOWN */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* SMART CHECKLIST */}
                <div className="lg:col-span-8 diary-card p-4 md:p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-diary-navy/10">
                      <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                        My goal is... (SMART checklist)
                      </h2>
                      <div className="text-caption font-bold text-diary-navy bg-diary-gold/25 px-2.5 py-0.5 rounded-full tabular-nums border border-diary-gold/40">
                        SMART score: {smartScore} / 5
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {[
                        { key: 'is_specific', letter: 'S', label: 'Specific' },
                        { key: 'is_measurable', letter: 'M', label: 'Measurable' },
                        { key: 'is_achievable', letter: 'A', label: 'Achievable' },
                        { key: 'is_reason', letter: 'R', label: 'Reason' },
                        { key: 'is_timebound', letter: 'T', label: 'Time-bound' },
                      ].map((item) => {
                        const isChecked = Boolean(activeGoal[item.key as keyof SmartGoal]);
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleUpdateActiveGoal({ [item.key]: !isChecked })}
                            className={`p-3 rounded-lg border text-center transition-all min-h-[44px] ${
                              isChecked
                                ? 'bg-diary-navy text-white border-diary-navy shadow-xs'
                                : 'bg-diary-cream-light/60 hover:bg-diary-cream text-diary-navy border-diary-navy/20'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 mx-auto rounded-full font-heading font-bold text-caption flex items-center justify-center mb-1 ${
                                isChecked ? 'bg-diary-gold text-diary-navy' : 'bg-white text-diary-navy border border-diary-navy/20'
                              }`}
                            >
                              {item.letter}
                            </div>
                            <div className="text-caption font-semibold">
                              {item.label}
                            </div>
                            <div className="mt-1 flex justify-center">
                              {isChecked ? (
                                <CheckSquare className="w-3.5 h-3.5 text-diary-gold" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-diary-navy/40" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* COMPLETION DATE CARD */}
                <div className="lg:col-span-4 diary-card p-4 md:p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 pb-3 mb-3 border-b border-diary-navy/10">
                      <Calendar className="w-4 h-4 text-diary-navy" />
                      <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                        Completion date
                      </h2>
                    </div>

                    <div className="bg-diary-cream-light/40 p-2.5 rounded-lg border border-diary-navy/20 mb-3">
                      <label className="text-tag uppercase text-diary-navy/70 font-semibold block mb-1">
                        Target deadline
                      </label>
                      <input
                        type="date"
                        value={activeGoal.completion_date}
                        onChange={(e) => handleUpdateActiveGoal({ completion_date: e.target.value })}
                        className="w-full font-heading font-semibold text-body-medium text-diary-navy focus:outline-none bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Countdown Badge */}
                  <div
                    className={`p-3 rounded-lg text-center border ${
                      daysLeft < 0
                        ? 'bg-red-50 border-red-200 text-red-800 font-semibold'
                        : daysLeft <= 7
                        ? 'bg-amber-50 border-amber-200 text-amber-900 font-semibold'
                        : 'bg-diary-cream-light border-diary-navy/20 text-diary-navy font-semibold'
                    }`}
                  >
                    <div className="text-section-title font-heading font-bold tabular-nums">
                      {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                    </div>
                    <div className="text-caption text-diary-navy/60 font-medium mt-0.5">
                      Countdown to target
                    </div>
                  </div>
                </div>
              </div>

              {/* KEY STEPS TABLE */}
              <div className="diary-card p-4 md:p-6">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-diary-navy" />
                    <h2 className="font-heading text-card-title text-diary-navy">
                      Key steps & milestones
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStepRow}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-diary-cream hover:bg-diary-cream-dark text-diary-navy text-caption font-bold rounded-lg transition-colors border border-diary-navy/20 min-h-[36px]"
                  >
                    <Plus className="w-3.5 h-3.5 text-diary-navy" />
                    <span>Add step</span>
                  </button>
                </div>

                {/* DESKTOP TABLE VIEW */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-diary-navy/20">
                  <table className="diary-table">
                    <thead>
                      <tr>
                        <th className="w-10 text-center">#</th>
                        <th className="text-left">Description</th>
                        <th className="w-36 text-center">Starting date</th>
                        <th className="w-36 text-center">Finishing date</th>
                        <th className="w-20 text-center">Done</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSteps.map((step, idx) => (
                        <tr key={step.id}>
                          <td className="text-center font-heading font-semibold text-diary-navy text-caption">
                            {idx + 1}
                          </td>
                          <td>
                            <input
                              type="text"
                              value={step.description}
                              onChange={(e) => handleUpdateStep(step.id, { description: e.target.value })}
                              placeholder={`Step #${idx + 1} description...`}
                              className={`w-full bg-transparent focus:outline-none text-body-default ${
                                step.done ? 'line-through text-diary-navy/40' : 'text-diary-text'
                              }`}
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="date"
                              value={step.start_date || ''}
                              onChange={(e) => handleUpdateStep(step.id, { start_date: e.target.value })}
                              className="bg-transparent focus:outline-none text-caption text-diary-navy text-center"
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="date"
                              value={step.finish_date || ''}
                              onChange={(e) => handleUpdateStep(step.id, { finish_date: e.target.value })}
                              className="bg-transparent focus:outline-none text-caption text-diary-navy text-center"
                            />
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              onClick={() => handleUpdateStep(step.id, { done: !step.done })}
                              className="p-1 hover:text-diary-gold-dark text-diary-navy/50 min-w-[36px] min-h-[36px] inline-flex items-center justify-center"
                              aria-label="Toggle step done"
                            >
                              {step.done ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600 inline" />
                              ) : (
                                <Square className="w-4 h-4 text-diary-navy/40 inline" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE STACKED CARDS VIEW (<md) */}
                <div className="md:hidden space-y-3">
                  {activeSteps.map((step, idx) => (
                    <div
                      key={step.id}
                      className="p-3 bg-diary-cream-light/40 rounded-xl border border-diary-navy/15 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-heading font-bold text-diary-navy text-caption px-2 py-0.5 bg-diary-cream rounded border border-diary-navy/15">
                          Step #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateStep(step.id, { done: !step.done })}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-semibold border bg-white border-diary-navy/20 min-h-[36px]"
                        >
                          {step.done ? (
                            <>
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Done</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-4 h-4 text-diary-navy/40" />
                              <span className="text-diary-navy/60">Pending</span>
                            </>
                          )}
                        </button>
                      </div>

                      <input
                        type="text"
                        value={step.description}
                        onChange={(e) => handleUpdateStep(step.id, { description: e.target.value })}
                        placeholder={`Step #${idx + 1} description...`}
                        className={`w-full p-2.5 bg-white rounded-lg border border-diary-navy/20 text-body-medium focus:outline-none focus:ring-1 focus:ring-diary-navy min-h-[44px] ${
                          step.done ? 'line-through text-diary-navy/40' : 'text-diary-text'
                        }`}
                      />

                      <div className="grid grid-cols-2 gap-2 text-caption">
                        <div>
                          <label className="text-tag uppercase text-diary-navy/60 font-semibold block mb-0.5">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={step.start_date || ''}
                            onChange={(e) => handleUpdateStep(step.id, { start_date: e.target.value })}
                            className="w-full p-1.5 bg-white rounded border border-diary-navy/20 text-caption text-diary-navy min-h-[36px]"
                          />
                        </div>
                        <div>
                          <label className="text-tag uppercase text-diary-navy/60 font-semibold block mb-0.5">
                            Finish Date
                          </label>
                          <input
                            type="date"
                            value={step.finish_date || ''}
                            onChange={(e) => handleUpdateStep(step.id, { finish_date: e.target.value })}
                            className="w-full p-1.5 bg-white rounded border border-diary-navy/20 text-caption text-diary-navy min-h-[36px]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MILESTONES PROGRESS LOG & LINE CHART */}
              <div className="diary-card p-4 md:p-6">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-diary-navy/10">
                  <div>
                    <h2 className="font-heading text-card-title text-diary-navy font-semibold">
                      Milestones log
                    </h2>
                    <span className="text-caption text-diary-navy/60 font-medium">
                      Keep a log of progress measures over time
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-diary-navy hover:bg-diary-navy-dark text-white text-caption font-semibold rounded-lg transition-colors min-h-[36px] shadow-xs active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-diary-gold" />
                    <span>Log measure</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                      {activeMilestones.map((m, idx) => (
                        <div
                          key={m.id}
                          className="p-2.5 bg-diary-cream-light/40 rounded-lg border border-diary-navy/20 text-caption space-y-1.5 relative group hover:border-diary-navy/40 transition-colors"
                        >
                          <div className="flex items-center justify-between pb-0.5">
                            <span className="font-bold text-diary-navy text-tag uppercase tracking-wide">
                              #{idx + 1} measure
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteMilestone(m.id)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                              title={`Delete measure #${idx + 1}`}
                              aria-label={`Delete measure #${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input
                            type="date"
                            value={m.date}
                            onChange={(e) => handleUpdateMilestone(m.id, { date: e.target.value })}
                            className="w-full bg-white p-1.5 rounded border border-diary-navy/20 text-caption text-diary-navy"
                          />
                          <div className="flex items-center gap-1 bg-white p-1 rounded border border-diary-navy/20">
                            <span className="text-caption text-diary-navy/50 font-medium">Val:</span>
                            <input
                              type="number"
                              value={m.measure === 0 ? '' : m.measure}
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                handleUpdateMilestone(m.id, { measure: isNaN(val) ? 0 : val });
                              }}
                              className="w-full font-heading font-semibold text-caption text-diary-navy focus:outline-none tabular-nums"
                            />
                          </div>
                          <input
                            type="text"
                            value={m.note || ''}
                            onChange={(e) => handleUpdateMilestone(m.id, { note: e.target.value })}
                            placeholder="Note..."
                            className="w-full bg-transparent text-caption text-diary-navy/70 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-diary-cream-light/30 p-4 rounded-xl border border-diary-navy/20">
                    <div className="text-caption font-semibold text-diary-navy mb-2 flex items-center justify-between">
                      <span>Progression trajectory</span>
                      <span className="text-caption text-diary-navy/60 font-medium">Trendline</span>
                    </div>
                    <div className="h-40 w-full">
                      {chartData.length < 2 ? (
                        <div className="h-full flex items-center justify-center text-caption text-slate-400 text-center p-4">
                          Log at least 2 milestone entries to view the trendline.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                            <XAxis dataKey="pointLabel" tick={{ fontSize: 9, fill: '#64748B' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#2A3B6B',
                                color: '#FFFFFF',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '12px'
                              }}
                              formatter={(value: any, _name: any, item: any) => [
                                `${value} ${item?.payload?.note ? `— "${item.payload.note}"` : ''}`,
                                'Progress Val'
                              ]}
                              labelFormatter={(label: any) => `${label}`}
                            />
                            <Line
                              type="monotone"
                              dataKey="measure"
                              stroke="#F2B230"
                              strokeWidth={2.5}
                              dot={{ fill: '#2A3B6B', r: 3.5 }}
                              activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </DiaryPageFrame>
  );
};
