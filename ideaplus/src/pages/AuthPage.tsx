import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  User,
  Building,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { brandConfig } from '../config/brand.config';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithEmail, signupWithEmail, loginWithGoogle, switchDemoUser } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        navigate('/');
      } else if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your full name');
        await signupWithEmail(email, password, name, businessName || 'My Business');
        navigate('/');
      } else {
        setSuccessMsg('Password reset instructions sent to your email.');
        setTimeout(() => setMode('login'), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = async (userIndex: 1 | 2 | 3) => {
    await switchDemoUser(userIndex);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md diary-card p-6 sm:p-8">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-white rounded-xl p-1.5 mx-auto mb-3 border border-slate-200 shadow-xs flex items-center justify-center">
            <img src={brandConfig.logoUrl || '/logo.png'} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-heading font-bold text-section-title text-diary-navy">
            {brandConfig.appName}
          </h1>
          <p className="text-caption text-slate-500 mt-1">
            {brandConfig.dailyTagline}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6 text-caption font-medium">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); }}
            className={`py-2 rounded-md transition-all ${
              mode === 'login'
                ? 'bg-white text-diary-navy font-semibold shadow-xs'
                : 'text-slate-600 hover:text-diary-navy'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(null); }}
            className={`py-2 rounded-md transition-all ${
              mode === 'signup'
                ? 'bg-white text-diary-navy font-semibold shadow-xs'
                : 'text-slate-600 hover:text-diary-navy'
            }`}
          >
            Create account
          </button>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-caption rounded-lg">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-caption rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="text-caption font-semibold text-diary-navy block mb-1">
                  Full name
                </label>
                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <User className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aravind Krishnan"
                    className="w-full bg-transparent text-body-default text-diary-text focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-caption font-semibold text-diary-navy block mb-1">
                  Business name
                </label>
                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <Building className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Apex Strategic Innovations"
                    className="w-full bg-transparent text-body-default text-diary-text focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-caption font-semibold text-diary-navy block mb-1">
              Email address
            </label>
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <Mail className="w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="executive@yourcompany.com"
                className="w-full bg-transparent text-body-default text-diary-text focus:outline-none"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-caption font-semibold text-diary-navy">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-caption text-slate-500 hover:text-diary-navy"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <Lock className="w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-body-default text-diary-text focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-diary-navy hover:bg-diary-navy-dark text-white rounded-lg text-body-medium font-medium flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 min-h-[44px]"
          >
            <span>
              {submitting
                ? 'Authenticating...'
                : mode === 'login'
                ? 'Sign in to diary'
                : mode === 'signup'
                ? 'Create account'
                : 'Send reset instructions'}
            </span>
            <ArrowRight className="w-4 h-4 text-diary-gold" />
          </button>
        </form>

        {/* Google Sign In */}
        <div className="mt-4">
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-2 text-caption text-slate-400 absolute">
              or continue with
            </span>
          </div>

          <button
            type="button"
            onClick={loginWithGoogle}
            className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-body-medium font-medium text-slate-700 flex items-center justify-center gap-2 transition-colors min-h-[44px]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google account</span>
          </button>
        </div>

        {/* Demo Quick Accounts */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <div className="text-caption text-slate-400 mb-2">
            Try a demo account:
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo(1)}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 rounded-md text-caption font-medium text-slate-700 min-h-[36px]"
            >
              User 1 (CEO)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo(2)}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 rounded-md text-caption font-medium text-slate-700 min-h-[36px]"
            >
              User 2 (Sales)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo(3)}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 rounded-md text-caption font-medium text-slate-700 min-h-[36px]"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
