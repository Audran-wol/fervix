import { create } from 'zustand';

export interface TreatmentSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  temperature: number;
  status: 'idle' | 'heating' | 'treatment' | 'completed' | 'aborted';
  progress: number; // 0 to 1
  errorMessage?: string;
}

interface SessionState {
  // Profile settings
  profile: 'child' | 'adult';
  setProfile: (profile: 'child' | 'adult') => void;

  // Current phase
  phase: 'idle' | 'heating' | 'treatment' | 'completed' | 'aborted';
  setPhase: (phase: 'idle' | 'heating' | 'treatment' | 'completed' | 'aborted') => void;

  // Current session
  currentSession: TreatmentSession | null;
  
  // Session history
  sessionHistory: TreatmentSession[];

  // Session actions
  startSession: (temperature: number, duration: number) => void;
  updateSessionProgress: (progress: number) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSession: () => void;
  abortSession: (reason?: string) => void;
  clearCurrentSession: () => void;

  // History actions
  addToHistory: (session: TreatmentSession) => void;
  clearHistory: () => void;
  getSessionById: (id: string) => TreatmentSession | undefined;

  // Statistics
  getTotalSessions: () => number;
  getCompletedSessions: () => number;
  getAverageDuration: () => number;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  profile: 'adult',
  phase: 'idle',
  currentSession: null,
  sessionHistory: [],

  setProfile: (profile) => set({ profile }),
  setPhase: (phase) => set({ phase }),

  startSession: (temperature: number, duration: number) => {
    const newSession: TreatmentSession = {
      id: Date.now().toString(),
      startTime: new Date(),
      duration,
      temperature,
      status: 'heating',
      progress: 0,
    };

    set({ currentSession: newSession, phase: 'heating' });
  },

  updateSessionProgress: (progress: number) => {
    const { currentSession } = get();
    if (currentSession) {
      set({
        currentSession: {
          ...currentSession,
          progress: Math.min(1, Math.max(0, progress)),
          status: progress > 0 ? 'treatment' : currentSession.status,
        },
        phase: progress > 0 ? 'treatment' : 'heating',
      });
    }
  },

  pauseSession: () => {
    const { currentSession } = get();
    if (currentSession && currentSession.status === 'treatment') {
      set({
        currentSession: {
          ...currentSession,
          status: 'treatment', // Keep as treatment but paused internally
        },
      });
    }
  },

  resumeSession: () => {
    const { currentSession } = get();
    if (currentSession && currentSession.status === 'treatment') {
      set({
        currentSession: {
          ...currentSession,
          status: 'treatment',
        },
      });
    }
  },

  completeSession: () => {
    const { currentSession, addToHistory } = get();
    if (currentSession) {
      const completedSession: TreatmentSession = {
        ...currentSession,
        endTime: new Date(),
        status: 'completed',
        progress: 1,
      };

      addToHistory(completedSession);
      set({ currentSession: null, phase: 'completed' });
    }
  },

  abortSession: (reason?: string) => {
    const { currentSession, addToHistory } = get();
    if (currentSession) {
      const abortedSession: TreatmentSession = {
        ...currentSession,
        endTime: new Date(),
        status: 'aborted',
        errorMessage: reason,
      };

      addToHistory(abortedSession);
      set({ currentSession: null, phase: 'aborted' });
    }
  },

  clearCurrentSession: () => {
    set({ currentSession: null });
  },

  addToHistory: (session: TreatmentSession) => {
    set((state) => ({
      sessionHistory: [session, ...state.sessionHistory],
    }));
  },

  clearHistory: () => {
    set({ sessionHistory: [] });
  },

  getSessionById: (id: string) => {
    const { sessionHistory } = get();
    return sessionHistory.find((session) => session.id === id);
  },

  getTotalSessions: () => {
    const { sessionHistory } = get();
    return sessionHistory.length;
  },

  getCompletedSessions: () => {
    const { sessionHistory } = get();
    return sessionHistory.filter((session) => session.status === 'completed').length;
  },

  getAverageDuration: () => {
    const { sessionHistory } = get();
    const completedSessions = sessionHistory.filter((session) => session.status === 'completed');
    
    if (completedSessions.length === 0) return 0;
    
    const totalDuration = completedSessions.reduce((sum, session) => sum + session.duration, 0);
    return totalDuration / completedSessions.length;
  },
}));
