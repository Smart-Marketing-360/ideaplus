import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Download,
  Lock
} from 'lucide-react';
import { DiaryPageFrame } from '../components/layout/DiaryPageFrame';
import { useAuth } from '../context/AuthContext';
import { getAdminUsersList } from '../lib/dataService';
import { Profile } from '../types/database';

export const AdminPage: React.FC = () => {
  const { isAdmin, switchDemoUser } = useAuth();
  const [usersList, setUsersList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const list = await getAdminUsersList();
        setUsersList(list);
      } catch (err) {
        console.error('Error fetching admin users:', err);
      } finally {
        setLoading(false);
      }
    }

    if (isAdmin) {
      load();
    }
  }, [isAdmin]);

  const handleExportUsers = () => {
    let csv = 'ID,Name,Business Name,Timezone,Is Admin,Updated At\n';
    usersList.forEach((u) => {
      csv += `"${u.id}","${u.name}","${u.business_name}","${u.timezone}","${u.is_admin ? 'Yes' : 'No'}","${u.updated_at || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registered-users-metadata-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <DiaryPageFrame title="Admin panel" subtitle="Restricted access">
        <div className="diary-card py-16 text-center max-w-md mx-auto p-6 space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-section-title font-heading font-semibold text-diary-navy">
            Administrator permissions required
          </h2>
          <p className="text-body-default text-slate-500">
            You are signed in as a standard executive. To test the administrative console, switch to the built-in admin account.
          </p>
          <button
            type="button"
            onClick={() => switchDemoUser(3)}
            className="px-4 py-2.5 bg-diary-navy text-white font-medium text-body-medium rounded-lg shadow-xs min-h-[44px]"
          >
            Switch to admin account
          </button>
        </div>
      </DiaryPageFrame>
    );
  }

  return (
    <DiaryPageFrame
      title="User management"
      subtitle="Account metadata and platform metrics"
    >
      <div className="space-y-6">
        {/* PRIVACY SHIELD GUARD BANNER */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-950">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-body-default">
            <span className="font-heading font-semibold text-card-title block text-emerald-900">
              Zero-diary-content access architecture
            </span>
            <p className="mt-1 text-caption text-emerald-800 leading-relaxed">
              Row Level Security (RLS) strictly prevents administrators from accessing personal diary entries, goals, or financial metrics. Administrators only see account registration metadata.
            </p>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="diary-card p-4 md:p-6">
            <span className="text-caption font-semibold text-slate-500 block mb-1">
              Total registered users
            </span>
            <span className="text-[28px] font-heading font-bold text-diary-navy tabular-nums">
              {usersList.length}
            </span>
          </div>

          <div className="diary-card p-4 md:p-6">
            <span className="text-caption font-semibold text-slate-500 block mb-1">
              Active enterprise accounts
            </span>
            <span className="text-[28px] font-heading font-bold text-diary-navy tabular-nums">
              {usersList.filter((u) => u.business_name).length}
            </span>
          </div>

          <div className="diary-card p-4 md:p-6">
            <span className="text-caption font-semibold text-slate-500 block mb-1">
              System administrators
            </span>
            <span className="text-[28px] font-heading font-bold text-diary-navy tabular-nums">
              {usersList.filter((u) => u.is_admin).length}
            </span>
          </div>
        </div>

        {/* USERS LIST TABLE */}
        <div className="diary-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-diary-navy" />
              <h3 className="font-heading text-card-title text-diary-navy">
                User registry
              </h3>
            </div>
            <button
              type="button"
              onClick={handleExportUsers}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-diary-navy text-caption font-medium rounded-lg transition-colors min-h-[36px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-body-default text-slate-400">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="diary-table">
                <thead>
                  <tr>
                    <th className="w-12 text-center">#</th>
                    <th className="text-left">Name</th>
                    <th className="text-left">Business name</th>
                    <th className="text-center w-40">Timezone</th>
                    <th className="text-center w-28">Role</th>
                    <th className="text-center w-36">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u, i) => (
                    <tr key={u.id}>
                      <td className="text-center font-heading font-semibold text-diary-navy text-caption">
                        {i + 1}
                      </td>
                      <td className="font-medium text-diary-navy text-body-medium">
                        {u.name || 'Anonymous Leader'}
                      </td>
                      <td className="text-slate-600 text-body-default">
                        {u.business_name || 'Individual'}
                      </td>
                      <td className="text-center text-caption text-slate-500">
                        {u.timezone || 'Asia/Kolkata'}
                      </td>
                      <td className="text-center">
                        {u.is_admin ? (
                          <span className="px-2 py-0.5 rounded bg-diary-navy text-white text-tag uppercase font-semibold">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-tag uppercase font-semibold">
                            Executive
                          </span>
                        )}
                      </td>
                      <td className="text-center text-caption text-slate-500 tabular-nums">
                        {u.updated_at ? new Date(u.updated_at).toLocaleDateString() : 'Active today'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DiaryPageFrame>
  );
};
