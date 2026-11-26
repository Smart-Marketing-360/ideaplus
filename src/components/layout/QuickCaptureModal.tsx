import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  X,
  Plus,
  Check,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { quickAddTodoToDay } from '../../lib/dataService';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const CATEGORIES = [
  { id: 'strategy', label: 'Strategy' },
  { id: 'sales', label: 'Sales' },
  { id: 'systems', label: 'Systems' },
  { id: 'operations', label: 'Operations' }
] as const;

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [taskText, setTaskText] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number | undefined>(30);
  const [selectedCategory, setSelectedCategory] = useState<string>('strategy');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      await quickAddTodoToDay(user.id, todayStr, taskText.trim(), {
        estimated_minutes: selectedDuration,
        category: selectedCategory
      });

      // Notify any active planner page to reload immediately without browser refresh
      window.dispatchEvent(new CustomEvent('todo_captured', { detail: { date: todayStr } }));

      setSuccessMsg(`Task "${taskText.trim()}" added to today's diary.`);
      setTaskText('');

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error('Failed to capture task', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-diary-navy/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-diary-navy/20 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-150 max-h-[90dvh] overflow-y-auto"
        style={{
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Editorial & Crisp */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-white">
          <div>
            <h2 className="font-heading text-card-title text-diary-navy font-semibold tracking-tight">
              Quick Task Entry
            </h2>
            <p className="text-caption text-slate-500 mt-0.5">
              Today · {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-diary-navy hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {successMsg ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-body-medium font-medium">{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/daily');
                }}
                className="text-xs font-semibold text-emerald-900 underline flex items-center gap-1 shrink-0 hover:text-emerald-950"
              >
                <span>View planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              {/* Task Text Input */}
              <div>
                <label className="block text-caption font-semibold text-diary-navy mb-1.5">
                  Task description
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  placeholder="e.g., Finalize board presentation, review cash flow..."
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50/60 border border-slate-300 rounded-lg text-diary-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-diary-navy/20 focus:border-diary-navy font-normal transition-all"
                />
              </div>

              {/* Integrated Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Category Selection */}
                <div>
                  <label className="block text-caption font-semibold text-diary-navy mb-1.5">
                    Strategic category
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-2.5 py-2 text-xs rounded-md border text-left flex items-center justify-between transition-all ${
                          selectedCategory === cat.id
                            ? 'bg-diary-navy text-white border-diary-navy shadow-2xs font-semibold'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 font-normal'
                        }`}
                      >
                        <span className="truncate">{cat.label}</span>
                        {selectedCategory === cat.id && (
                          <Check className="w-3 h-3 text-diary-gold shrink-0 ml-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-caption font-semibold text-diary-navy">
                      Time budget
                    </label>
                    {selectedDuration && (
                      <button
                        type="button"
                        onClick={() => setSelectedDuration(undefined)}
                        className="text-[11px] text-slate-400 hover:text-slate-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DURATION_OPTIONS.map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setSelectedDuration(selectedDuration === min ? undefined : min)}
                        className={`px-2 py-2 text-xs rounded-md border text-center transition-all ${
                          selectedDuration === min
                            ? 'bg-diary-navy text-diary-gold border-diary-navy shadow-2xs font-semibold'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 font-normal'
                        }`}
                      >
                        {min < 60 ? `${min}m` : `${min / 60}h`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer controls */}
              <div className="pt-4 mt-2 border-t border-slate-200 flex items-center justify-between">
                <div className="text-caption text-slate-400 flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600">Enter</kbd>
                  <span>to save</span>
                  <span className="text-slate-300">·</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600">Esc</kbd>
                  <span>to close</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-diary-navy hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!taskText.trim() || isSubmitting}
                    className="px-4 py-2 bg-diary-navy hover:bg-diary-navy-dark disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-diary-gold" />
                    <span>{isSubmitting ? 'Saving...' : 'Add to Diary'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
