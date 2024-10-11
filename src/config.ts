export enum Page {
  Config = 'CONFIG',
  Timer = 'TIMER',
}

export interface TimerConfig {
  // The exercises to do.
  exercises: string[];
  // TODO add configuration for active vs rest
}

// Runtime type guard for config.
function asConfig(x: any): TimerConfig | null {
  if (x === null || typeof x !== 'object') {
    return null;
  }
  if (Object.keys(x).length !== 1) {
    return null;
  }
  if (!Array.isArray(x.exercises)) {
    return null;
  }
  for (const e of x.exercises) {
    if (typeof e !== 'string') {
      return null;
    }
  }
  return (x as TimerConfig);
}

export const defaultTimerConfig: TimerConfig = {
  exercises: [
    'Lat pulls',
    'Face pulls',
    'Rows',
    'Lateral Raises',
    'Jumping Jacks',
    'Shoulder Shrugs',
    'Overhead Press',
    'Bicep Curls',
    'Lunges',
    'Sumo Squats',
    'Dumbbell Swings',
    'Half-kneeling Rows',
    'Chest Fly',
    'Clamshells',
    'Chest Press',
  ],
};

export function loadConfigFromLocalStorage(): TimerConfig {
  const parsed = asConfig(JSON.parse(localStorage.getItem('timer-config') || 'null'));
  if (parsed !== null) {
    return parsed;
  }
  saveConfigToLocalStorage(defaultTimerConfig);
  return defaultTimerConfig;
}

export function saveConfigToLocalStorage(config: TimerConfig) {
  localStorage.setItem('timer-config', JSON.stringify(config));
}
