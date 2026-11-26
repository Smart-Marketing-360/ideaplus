import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

export type SaveState = 'saved' | 'saving' | 'offline_queued' | 'idle';

interface AutosaveContextType {
  status: SaveState;
  lastSavedAt: Date | null;
  triggerSave: <T>(saveFn: () => Promise<T>, delay?: number) => void;
  setStatus: (status: SaveState) => void;
}

const AutosaveContext = createContext<AutosaveContextType | undefined>(undefined);

export const AutosaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SaveState>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(new Date());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = useCallback(<T,>(saveFn: () => Promise<T>, delay = 800) => {
    setStatus('saving');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      try {
        await saveFn();
        setStatus(navigator.onLine ? 'saved' : 'offline_queued');
        setLastSavedAt(new Date());
      } catch (err) {
        console.error('Autosave error:', err);
        setStatus('offline_queued');
      }
    }, delay);
  }, []);

  return (
    <AutosaveContext.Provider value={{ status, lastSavedAt, triggerSave, setStatus }}>
      {children}
    </AutosaveContext.Provider>
  );
};

export function useAutosave() {
  const context = useContext(AutosaveContext);
  if (!context) {
    throw new Error('useAutosave must be used within an AutosaveProvider');
  }
  return context;
}
