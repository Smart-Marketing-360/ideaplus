import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Headphones,
  TrendingUp
} from 'lucide-react';
import { DiaryPageFrame } from '../components/layout/DiaryPageFrame';
import { useAuth } from '../context/AuthContext';
import { useAutosave } from '../context/AutosaveContext';
import { getManagementItems, saveManagementItems } from '../lib/dataService';
import { ManagementItem, ManagementType, ManagementStatus } from '../types/database';

export const ManagementSystemsPage: React.FC = () => {
  const { user } = useAuth();
  const { triggerSave } = useAutosave();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<ManagementType>('system');
  const [loading, setLoading] = useState<boolean>(true);
  const [items, setItems] = useState<ManagementItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Open' | 'Solved'>('all');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchTerm(q);
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await getManagementItems(user!.id, activeTab);
        if (!isCancelled) setItems(data);
      } catch (err) {
        console.error('Failed to load management items:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [user?.id, activeTab]);

  const handleUpdateItem = (itemId: string, updates: Partial<ManagementItem>) => {
    if (!user) return;
    const updated = items.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
    setItems(updated);
    triggerSave(() => saveManagementItems(user.id, activeTab, updated));
  };

  const toggleStatus = (itemId: string, current: ManagementStatus) => {
    const next: ManagementStatus = current === 'Open' ? 'Solved' : 'Open';
    handleUpdateItem(itemId, { status: next });
  };

  const handleAddRow = () => {
    if (!user) return;
    const newItem: ManagementItem = {
      id: crypto.randomUUID(),
      user_id: user.id,
      type: activeTab,
      challenge: '',
      reason: '',
      solution: '',
      status: 'Open',
      sort_order: items.length
    };
    const updated = [...items, newItem];
    setItems(updated);
    triggerSave(() => saveManagementItems(user.id, activeTab, updated));
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.challenge.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.solution.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const tabLabels: Record<ManagementType, { title: string; subtitle: string; icon: React.ComponentType<any> }> = {
    system: {
      title: 'System management',
      subtitle: 'Operational processes, tooling, infrastructure & workflow optimizations',
      icon: Cpu
    },
    service: {
      title: 'Service management',
      subtitle: 'Client delivery, quality standards, support turnaround & SLA standards',
      icon: Headphones
    },
    sales: {
      title: 'Sales management',
      subtitle: 'Pipelines, conversion bottlenecks, margin controls & client acquisition',
      icon: TrendingUp
    }
  };

  const currentTabMeta = tabLabels[activeTab];

  return (
    <DiaryPageFrame
      title={currentTabMeta.title}
      subtitle={currentTabMeta.subtitle}
    >
      <div className="space-y-6">
        {/* THREE SYSTEM TABS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['system', 'service', 'sales'] as const).map((typeKey) => {
            const tab = tabLabels[typeKey];
            const Icon = tab.icon;
            const isActive = activeTab === typeKey;

            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => setActiveTab(typeKey)}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 min-h-[44px] ${
                  isActive
                    ? 'bg-white border-diary-navy shadow-sm ring-1 ring-diary-navy/20'
                    : 'bg-white hover:bg-diary-cream-light border-diary-navy/20 text-diary-navy'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-diary-navy text-diary-gold' : 'bg-diary-cream-light text-diary-navy border border-diary-navy/15'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="font-heading font-semibold text-card-title text-diary-navy truncate">
                    {tab.title}
                  </div>
                  <div className="text-caption text-diary-navy/60 truncate">
                    Challenge → Reason → Solution
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* SEARCH & STATUS FILTER STRIP */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 diary-card p-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-diary-navy/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search challenges, reasons, or solutions..."
              className="w-full pl-9 pr-3 py-2 text-body-default bg-diary-cream-light/40 rounded-lg border border-diary-navy/20 text-diary-navy focus:outline-none focus:ring-1 focus:ring-diary-navy focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1 text-caption font-semibold">
            <span className="text-diary-navy/60 px-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {(['all', 'Open', 'Solved'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md transition-colors min-h-[36px] font-semibold ${
                  statusFilter === s
                    ? 'bg-diary-navy text-white shadow-xs'
                    : 'text-diary-navy/70 hover:bg-diary-cream-light'
                }`}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {/* TABLE: CHALLENGE | REASON | SOLUTION | STATUS */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-3 border-diary-gold border-t-diary-navy rounded-full animate-spin mb-3" />
            <p className="font-heading text-card-title text-diary-navy">Loading systems...</p>
          </div>
        ) : (
          <div className="diary-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="diary-table">
                <thead>
                  <tr>
                    <th className="w-12 text-center">#</th>
                    <th className="w-1/3 text-left">Challenge</th>
                    <th className="w-1/4 text-left">Reason</th>
                    <th className="w-1/3 text-left">Solution</th>
                    <th className="w-28 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400 bg-white">
                        No management items found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="text-center font-heading font-semibold text-diary-navy text-caption align-top pt-3">
                          {idx + 1}
                        </td>

                        <td className="align-top">
                          <textarea
                            rows={3}
                            value={item.challenge}
                            onChange={(e) => handleUpdateItem(item.id, { challenge: e.target.value })}
                            placeholder="What breakdown or friction occurred?..."
                            className="w-full bg-transparent text-body-medium font-semibold text-diary-text focus:outline-none resize-none"
                          />
                        </td>

                        <td className="align-top">
                          <textarea
                            rows={3}
                            value={item.reason}
                            onChange={(e) => handleUpdateItem(item.id, { reason: e.target.value })}
                            placeholder="Root cause behind the issue?..."
                            className="w-full bg-transparent text-body-default text-slate-600 focus:outline-none resize-none"
                          />
                        </td>

                        <td className="align-top">
                          <textarea
                            rows={3}
                            value={item.solution}
                            onChange={(e) => handleUpdateItem(item.id, { solution: e.target.value })}
                            placeholder="Systemic SOP fix to prevent recurrence..."
                            className="w-full bg-transparent text-body-default text-diary-text focus:outline-none resize-none"
                          />
                        </td>

                        <td className="text-center align-top pt-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleStatus(item.id, item.status)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-medium border transition-all ${
                              item.status === 'Solved'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}
                            title="Click to toggle status"
                          >
                            {item.status === 'Solved' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Solved</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Open</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-caption text-slate-500">
                {items.filter((i) => i.status === 'Open').length} open challenge(s) requiring systemic solution.
              </span>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-diary-navy hover:bg-diary-navy-dark text-white rounded-lg text-caption font-medium transition-colors min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5 text-diary-gold" />
                <span>Add row</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </DiaryPageFrame>
  );
};
