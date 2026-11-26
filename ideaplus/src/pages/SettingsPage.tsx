import React, { useState, useEffect } from 'react';
import {
  User,
  Building,
  Phone,
  Globe,
  Bell,
  Download,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { DiaryPageFrame } from '../components/layout/DiaryPageFrame';
import { useAuth } from '../context/AuthContext';
import { useAutosave } from '../context/AutosaveContext';
import { updateProfile } from '../lib/dataService';
import { brandConfig } from '../config/brand.config';

export const SettingsPage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { triggerSave } = useAutosave();

  const [name, setName] = useState<string>(profile?.name || '');
  const [businessName, setBusinessName] = useState<string>(profile?.business_name || '');
  const [phone, setPhone] = useState<string>(profile?.phone || '');
  const [timezone, setTimezone] = useState<string>(profile?.timezone || 'Asia/Kolkata');
  const [logoUrl, setLogoUrl] = useState<string>(profile?.logo_url || '');

  // 4 Daily Checks Labels
  const [dailyCheckLabels, setDailyCheckLabels] = useState<string[]>(
    profile?.daily_checks_labels || [...brandConfig.defaults.dailyCheckLabels]
  );

  // 4 Time Audit Slot Labels
  const [timeAuditLabels, setTimeAuditLabels] = useState<string[]>(
    profile?.time_audit_labels || [...brandConfig.defaults.timeAuditSlotLabels]
  );

  const [reminderTime, setReminderTime] = useState<string>(() => {
    return localStorage.getItem('bizdiary_reminder_time') || '07:00';
  });
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('bizdiary_reminder_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Auto-scroll to reminder settings if hash is present
  useEffect(() => {
    if (window.location.hash === '#reminder-settings') {
      const el = document.getElementById('reminder-settings');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-diary-gold');
        setTimeout(() => el.classList.remove('ring-2', 'ring-diary-gold'), 2500);
      }
    }
  }, []);

  const handleSaveProfile = async (fieldUpdates: Record<string, any>) => {
    if (!user) return;
    triggerSave(async () => {
      await updateProfile(user.id, fieldUpdates);
      await refreshProfile();
    });
  };

  const handleCheckLabelChange = (index: number, val: string) => {
    const updated = [...dailyCheckLabels];
    updated[index] = val;
    setDailyCheckLabels(updated);
    handleSaveProfile({ daily_checks_labels: updated });
  };

  const handleTimeSlotLabelChange = (index: number, val: string) => {
    const updated = [...timeAuditLabels];
    updated[index] = val;
    setTimeAuditLabels(updated);
    handleSaveProfile({ time_audit_labels: updated });
  };

  const handleExportJSON = () => {
    if (!user) return;
    const allData: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes(user.id) || key.startsWith('bizdiary_'))) {
        try {
          allData[key] = JSON.parse(localStorage.getItem(key) || 'null');
        } catch {
          allData[key] = localStorage.getItem(key);
        }
      }
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `business-diary-backup-${user.id}-${Date.now()}.json`);
    dlAnchor.click();
    dlAnchor.remove();

    setSaveBanner('Full JSON backup downloaded.');
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleExportCSV = () => {
    if (!user) return;
    const goalsKey = `bizdiary_goals_${user.id}`;
    const raw = localStorage.getItem(goalsKey);
    const goals = raw ? JSON.parse(raw) : [];

    let csvContent = 'data:text/csv;charset=utf-8,ID,Goal,Result Indicator,Action Plan,To Do,Status\n';
    goals.forEach((g: any) => {
      const row = [
        `"${g.id}"`,
        `"${(g.goal || '').replace(/"/g, '""')}"`,
        `"${(g.result_indicator || '').replace(/"/g, '""')}"`,
        `"${(g.action_plan || '').replace(/"/g, '""')}"`,
        `"${(g.todo || '').replace(/"/g, '""')}"`,
        `"${g.status === 2 ? 'Done' : g.status === 1 ? 'In Progress' : 'Not Started'}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', encodeURI(csvContent));
    dlAnchor.setAttribute('download', `business-diary-goals-${Date.now()}.csv`);
    dlAnchor.click();
    dlAnchor.remove();

    setSaveBanner('Goals CSV exported.');
    setTimeout(() => setSaveBanner(null), 3500);
  };

  return (
    <DiaryPageFrame
      title="Settings"
      subtitle="Executive preferences, custom labels, and data backup"
    >
      <div className="space-y-6">
        {saveBanner && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-body-default rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveBanner}</span>
          </div>
        )}

        {/* PROFILE & BUSINESS DETAILS */}
        <div className="diary-card p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-diary-navy" />
            <h2 className="font-heading text-card-title text-diary-navy">
              Profile & business identity
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-caption font-semibold text-diary-navy block mb-1">
                Executive full name
              </label>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <User className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    handleSaveProfile({ name: e.target.value });
                  }}
                  className="w-full bg-transparent text-body-default text-diary-navy focus:outline-none"
                  placeholder="Your full name..."
                />
              </div>
            </div>

            <div>
              <label className="text-caption font-semibold text-diary-navy block mb-1">
                Business / enterprise name
              </label>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <Building className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    handleSaveProfile({ business_name: e.target.value });
                  }}
                  className="w-full bg-transparent text-body-default text-diary-navy focus:outline-none"
                  placeholder="Organization or brand name..."
                />
              </div>
            </div>

            <div>
              <label className="text-caption font-semibold text-diary-navy block mb-1">
                Phone number
              </label>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <Phone className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    handleSaveProfile({ phone: e.target.value });
                  }}
                  className="w-full bg-transparent text-body-default text-diary-text focus:outline-none tabular-nums"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div>
              <label className="text-caption font-semibold text-diary-navy block mb-1">
                Timezone
              </label>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <Globe className="w-4 h-4 text-slate-400" />
                <select
                  value={timezone}
                  onChange={(e) => {
                    setTimezone(e.target.value);
                    handleSaveProfile({ timezone: e.target.value });
                  }}
                  className="w-full bg-transparent text-body-default text-diary-text focus:outline-none cursor-pointer"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST - UTC+4:00)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+8:00)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-caption font-semibold text-diary-navy block mb-1">
                Logo URL / avatar
              </label>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <ImageIcon className="w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    handleSaveProfile({ logo_url: e.target.value });
                  }}
                  className="w-full bg-transparent text-caption text-diary-text focus:outline-none"
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CUSTOMIZABLE LABELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 4 DAILY CHECKS */}
          <div className="diary-card p-4 md:p-6 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading text-card-title text-diary-navy">
                Daily checks labels
              </h3>
              <span className="text-caption text-slate-400">Shown on daily planner</span>
            </div>

            <div className="space-y-2.5">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-diary-navy font-heading font-semibold text-caption flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={dailyCheckLabels[idx] || ''}
                    onChange={(e) => handleCheckLabelChange(idx, e.target.value)}
                    placeholder={`Check #${idx + 1} label...`}
                    className="flex-1 p-2 bg-slate-50 rounded-lg border border-slate-200 text-body-default text-diary-text focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 4 TIME AUDIT SLOTS */}
          <div className="diary-card p-4 md:p-6 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading text-card-title text-diary-navy">
                Time audit slot labels
              </h3>
              <span className="text-caption text-slate-400">Shown on monthly review</span>
            </div>

            <div className="space-y-2.5">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-diary-gold/20 text-diary-navy font-heading font-semibold text-caption flex items-center justify-center shrink-0">
                    S{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={timeAuditLabels[idx] || ''}
                    onChange={(e) => handleTimeSlotLabelChange(idx, e.target.value)}
                    placeholder={`Slot #${idx + 1} label...`}
                    className="flex-1 p-2 bg-slate-50 rounded-lg border border-slate-200 text-body-default text-diary-text focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* REMINDER & BACKUP EXPORTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* REMINDER */}
          <div
            id="reminder-settings"
            className="diary-card p-4 md:p-6 flex flex-col justify-between transition-all duration-300"
          >
            <div>
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                <Bell className="w-4 h-4 text-diary-navy" />
                <h3 className="font-heading text-card-title text-diary-navy">
                  Daily planner reminder
                </h3>
              </div>

              <p className="text-body-default text-slate-500 mb-4">
                Receive a prompt on your device at your chosen review time to plan today's priorities.
              </p>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <label className="text-body-medium font-medium text-diary-navy">
                  Reminder enabled:
                </label>
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setReminderEnabled(checked);
                    localStorage.setItem('bizdiary_reminder_enabled', String(checked));
                  }}
                  className="w-4 h-4 rounded text-diary-navy focus:ring-diary-gold cursor-pointer"
                />
              </div>

              {reminderEnabled && (
                <div className="mt-3 flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                  <label className="text-body-medium font-medium text-diary-navy">
                    Notification time:
                  </label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReminderTime(val);
                      localStorage.setItem('bizdiary_reminder_time', val);
                    }}
                    className="font-heading font-semibold text-body-medium text-diary-navy p-1 bg-transparent focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-caption text-slate-400">
              Notification preferences are stored locally on this device.
            </div>
          </div>

          {/* BACKUP EXPORTS */}
          <div className="diary-card p-4 md:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                <Download className="w-4 h-4 text-diary-navy" />
                <h3 className="font-heading text-card-title text-diary-navy">
                  Data backup & export
                </h3>
              </div>

              <p className="text-body-default text-slate-500 mb-4">
                Export all your strategic diary records for archival, compliance, or external reporting.
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="w-full py-2.5 px-4 bg-diary-navy hover:bg-diary-navy-dark text-white rounded-lg text-body-medium font-medium flex items-center justify-center gap-2 transition-colors min-h-[44px]"
                >
                  <Download className="w-4 h-4 text-diary-gold" />
                  <span>Download full JSON backup</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-diary-navy rounded-lg text-body-medium font-medium flex items-center justify-center gap-2 transition-colors min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Export goals register (CSV)</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-caption text-slate-400">
              Your diary data belongs solely to you and is encrypted with strict Row Level Security.
            </div>
          </div>
        </div>
      </div>
    </DiaryPageFrame>
  );
};
