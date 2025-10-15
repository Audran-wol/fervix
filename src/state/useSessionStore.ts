import { create } from 'zustand';
import type { Phase, IPowerController, PhaseChangedEvent } from './power';

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

  // Current phase (legacy compatibility)
  phase: 'idle' | 'heating' | 'treatment' | 'completed' | 'aborted';
  setPhase: (phase: 'idle' | 'heating' | 'treatment' | 'completed' | 'aborted') => void;

  // Backend power monitoring state
  backendPhase: Phase;
  remainingMs?: number;
  lastDelta_mA?: number;

  // Live monitoring state
  live: {
    baseline_mA: number;
    delta_mA: number;
    accessoryConnected: boolean;
  };

  // Current session
  currentSession: TreatmentSession | null;
  
  // Session history
  sessionHistory: TreatmentSession[];

  // Power controller integration
  bindPowerController: (controller: IPowerController) => void;
  requestStart: (params: { presetId: string; ambientC?: number }) => void;
  requestStop: () => void;

  // Session actions (legacy - now driven by power controller)
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

// Map backend Phase to legacy phase strings
const mapBackendPhase = (backendPhase: Phase): 'idle' | 'heating' | 'treatment' | 'completed' | 'aborted' => {
  switch (backendPhase) {
    case 'IDLE':
    case 'PREHEAT_DETECT':
      return 'idle';
    case 'HEATUP':
      return 'heating';
    case 'TREATMENT':
      return 'treatment';
    case 'COOLDOWN':
    case 'DONE':
      return 'completed';
    case 'ABORT':
      return 'aborted';
    default:
      return 'idle';
  }
};

let powerControllerInstance: IPowerController | null = null;
let phaseUnsubscribe: (() => void) | null = null;

export const useSessionStore = create<SessionState>((set, get) => ({
  profile: 'adult',
  phase: 'idle',
  backendPhase: 'IDLE',
  remainingMs: undefined,
  lastDelta_mA: undefined,
  live: {
    baseline_mA: 0,
    delta_mA: 0,
    accessoryConnected: false,
  },
  currentSession: null,
  sessionHistory: [],

  setProfile: (profile) => set({ profile }),
  setPhase: (phase) => set({ phase }),

  // Bind power controller and subscribe to phase changes (call once at app start)
  bindPowerController: (controller: IPowerController) => {
    console.log('[SessionStore] 🔗 Binding power controller...');
    powerControllerInstance = controller;

    // Unsubscribe from previous if exists
    if (phaseUnsubscribe) {
      phaseUnsubscribe();
    }

    // Subscribe to PhaseChanged events
    phaseUnsubscribe = controller.subscribe('PhaseChanged', (event: PhaseChangedEvent) => {
      const { phase: backendPhase, remainingMs, reason } = event;
      const mappedPhase = mapBackendPhase(backendPhase);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[SessionStore] 🔄 PhaseChanged event received:');
      console.log('  Phase:', backendPhase);
      console.log('  Remaining:', remainingMs, 'ms');
      console.log('  Reason:', reason || 'N/A');
      console.log('  Mapped:', mappedPhase);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      set({
        backendPhase,
        remainingMs,
        phase: mappedPhase,
      });

      // Update current session based on phase
      const { currentSession } = get();
      if (currentSession) {
        const updatedSession = { ...currentSession };

        // Update session status
        if (backendPhase === 'HEATUP') {
          updatedSession.status = 'heating';
        } else if (backendPhase === 'TREATMENT') {
          updatedSession.status = 'treatment';
        } else if (backendPhase === 'DONE' || backendPhase === 'COOLDOWN') {
          updatedSession.status = 'completed';
          updatedSession.endTime = new Date();
          updatedSession.progress = 1;
        } else if (backendPhase === 'ABORT') {
          updatedSession.status = 'aborted';
          updatedSession.endTime = new Date();
          updatedSession.errorMessage = reason || 'Session aborted';
        }

        set({ currentSession: updatedSession });

        // Add to history if session completed or aborted
        if (backendPhase === 'DONE' || backendPhase === 'ABORT') {
          get().addToHistory(updatedSession);
          set({ currentSession: null });
        }
      }
    });

    // Subscribe to Detector events for accessory connection status
    controller.subscribe('Detector', (event) => {
      const isConnected = event.type === 'ACCESSORY_CONNECTED';
      set(state => ({
        live: {
          ...state.live,
          accessoryConnected: isConnected,
        }
      }));
    });

    // Subscribe to Sample events to periodically update live baseline/delta
    let sampleCount = 0;
    controller.subscribe('Sample', () => {
      sampleCount++;
      // Update every 10th sample (~800ms) to avoid too frequent state updates
      if (sampleCount % 10 === 0) {
        const snapshot = controller.getSnapshot();
        if (snapshot instanceof Promise) {
          snapshot.then(data => {
            set(state => ({
              live: {
                ...state.live,
                baseline_mA: data.baseline_mA || 0,
                delta_mA: data.lastDelta_mA || 0,
              }
            }));
          });
        } else {
          set(state => ({
            live: {
              ...state.live,
              baseline_mA: snapshot.baseline_mA || 0,
              delta_mA: snapshot.lastDelta_mA || 0,
            }
          }));
        }
      }
    });

    console.log('[SessionStore] Power controller bound successfully');
  },

  // Start a new session through the power controller
  requestStart: (params: { presetId: string; ambientC?: number }) => {
    if (!powerControllerInstance) {
      console.error('[SessionStore] Power controller not bound');
      return;
    }

    // Create new session record
    const newSession: TreatmentSession = {
      id: Date.now().toString(),
      startTime: new Date(),
      duration: 0, // Will be calculated from preset
      temperature: params.ambientC || 0,
      status: 'idle',
      progress: 0,
    };

    set({ currentSession: newSession });

    // Start the power controller
    powerControllerInstance.startSession(params);
  },

  // Stop the current session
  requestStop: () => {
    if (!powerControllerInstance) {
      console.error('[SessionStore] Power controller not bound');
      return;
    }

    powerControllerInstance.stopSession();
  },

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
