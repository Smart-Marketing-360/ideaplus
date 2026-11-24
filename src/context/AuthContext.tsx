import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile } from '../types/database';
import { getProfile, updateProfile } from '../lib/dataService';

export interface UserSession {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: UserSession | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string, businessName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchDemoUser: (userIndex: 1 | 2 | 3) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Built-in presets for offline verification & 2-user RLS testing
export const DEMO_USERS = {
  1: {
    id: '11111111-1111-4111-a111-111111111111',
    email: 'ceo.leader@bizdiary.local',
    name: 'Aravind Krishnan',
    business_name: 'Apex Strategic Innovations',
    is_admin: false,
  },
  2: {
    id: '22222222-2222-4222-a222-222222222222',
    email: 'sales.head@bizdiary.local',
    name: 'Meera Sundaram',
    business_name: 'Zenith Global Solutions',
    is_admin: false,
  },
  3: {
    id: '33333333-3333-4333-a333-333333333333',
    email: 'admin@bizdiary.local',
    name: 'System Administrator',
    business_name: 'IdeaPlus Platform Administration',
    is_admin: true,
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session
  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
            });
            const p = await getProfile(session.user.id);
            setProfile(p);
          } else {
            // Restore demo session if saved
            restoreLocalUser();
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
              });
              const p = await getProfile(session.user.id);
              setProfile(p);
            } else {
              restoreLocalUser();
            }
          });
        } else {
          restoreLocalUser();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        restoreLocalUser();
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const restoreLocalUser = async () => {
    const saved = localStorage.getItem('bizdiary_current_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        const p = await getProfile(parsed.id);
        setProfile(p);
        return;
      } catch (e) {
        console.error(e);
      }
    }
    // Default to User 1 (CEO)
    await switchDemoUser(1);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        if (data.user) {
          const u: UserSession = {
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || email.split('@')[0]
          };
          setUser(u);
          const p = await getProfile(u.id);
          setProfile(p);
        }
      } else {
        // Offline / custom email login
        const id = 'user-' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
        const u: UserSession = { id, email, name: email.split('@')[0] };
        setUser(u);
        localStorage.setItem('bizdiary_current_user', JSON.stringify(u));
        const p = await getProfile(u.id);
        setProfile(p);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signupWithEmail = async (email: string, pass: string, name: string, businessName: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: { full_name: name, business_name: businessName }
          }
        });
        if (error) throw error;
        if (data.user) {
          const u: UserSession = { id: data.user.id, email: data.user.email || email, name };
          setUser(u);
          const p = await updateProfile(data.user.id, { name, business_name: businessName });
          setProfile(p);
        }
      } else {
        const id = 'user-' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
        const u: UserSession = { id, email, name };
        setUser(u);
        localStorage.setItem('bizdiary_current_user', JSON.stringify(u));
        const p = await updateProfile(id, { name, business_name: businessName });
        setProfile(p);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
    } else {
      // Simulate Google login in demo mode
      await loginWithEmail('google.user@example.com', 'demo12345');
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('bizdiary_current_user');
    setUser(null);
    setProfile(null);
  };

  const switchDemoUser = async (userIndex: 1 | 2 | 3) => {
    setIsLoading(true);
    const demo = DEMO_USERS[userIndex];
    const sessionUser: UserSession = {
      id: demo.id,
      email: demo.email,
      name: demo.name,
    };
    setUser(sessionUser);
    localStorage.setItem('bizdiary_current_user', JSON.stringify(sessionUser));

    // Ensure profile has matching name & admin flag
    const p = await updateProfile(demo.id, {
      name: demo.name,
      business_name: demo.business_name,
      is_admin: demo.is_admin,
    });
    setProfile(p);
    setIsLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await getProfile(user.id);
      setProfile(p);
    }
  };

  const isAdmin = Boolean(profile?.is_admin);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAdmin,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        logout,
        switchDemoUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
