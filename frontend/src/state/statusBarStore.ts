import { create } from 'zustand';
import { logError, logInfo, logWarn } from './logStore';

interface StatusBarStoreState {
  text: string;
  healthy: boolean | null;
  setText: (text: string) => void;
  refreshHealth: () => Promise<void>;
}

export const useStatusBarStore = create<StatusBarStoreState>()((set, get) => ({
  text: 'READY',
  healthy: null,

  setText: (text) => {
    set({ text });
  },

  refreshHealth: async () => {
    const previousHealthy = get().healthy;
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        if (previousHealthy !== false) {
          logError('health', `API responded ${response.status}`);
        }
        set({ healthy: false, text: `HEALTH FAIL (${response.status})` });
        return;
      }

      const payload = (await response.json()) as { status?: string; model_loaded?: boolean };
      const healthy = payload.status === 'ok';
      if (previousHealthy === null) {
        logInfo('health', healthy
          ? (payload.model_loaded ? 'API healthy, model loaded' : 'API healthy, model loading')
          : 'API responded but not healthy');
      } else if (previousHealthy !== healthy) {
        if (healthy) {
          logInfo('health', payload.model_loaded ? 'API recovered (model loaded)' : 'API recovered (model loading)');
        } else {
          logWarn('health', 'API now reporting unhealthy');
        }
      }
      set({
        healthy,
        text: healthy
          ? payload.model_loaded
            ? 'API HEALTHY // MODEL LOADED'
            : 'API HEALTHY // MODEL LOADING'
          : 'API UNHEALTHY',
      });
    } catch {
      if (previousHealthy !== false) {
        logError('health', 'API unreachable');
      }
      set({ healthy: false, text: 'API UNREACHABLE' });
    }
  },
}));
