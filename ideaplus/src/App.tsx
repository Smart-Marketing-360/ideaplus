import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AutosaveProvider } from './context/AutosaveContext';
import { AppLayout } from './components/layout/AppLayout';

import { DashboardPage } from './pages/DashboardPage';
import { DailyPlannerPage } from './pages/DailyPlannerPage';
import { MonthlyReviewPage } from './pages/MonthlyReviewPage';
import { GoalTrackerPage } from './pages/GoalTrackerPage';
import { SmartGoalsPage } from './pages/SmartGoalsPage';
import { PromotionPlansPage } from './pages/PromotionPlansPage';
import { ManagementSystemsPage } from './pages/ManagementSystemsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 mins
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-diary-gold border-t-diary-navy rounded-full animate-spin mb-3" />
          <p className="font-heading font-bold text-diary-navy">Loading Strategic Diary...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AutosaveProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Route */}
              <Route path="/auth" element={<AuthPage />} />

              {/* Protected Diary Routes in AppLayout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="daily" element={<DailyPlannerPage />} />
                <Route path="monthly" element={<MonthlyReviewPage />} />
                <Route path="goals" element={<GoalTrackerPage />} />
                <Route path="smart-goals" element={<SmartGoalsPage />} />
                <Route path="promotion" element={<PromotionPlansPage />} />
                <Route path="management" element={<ManagementSystemsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="admin" element={<AdminPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AutosaveProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
