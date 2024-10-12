export enum Page {
  Config = 'CONFIG',
  Timer = 'TIMER',
}

export interface TimerConfig {
  // The exercises to do.
  exercises: string[];

  // Number of sets and the timing of the exercises
  numSets: number;
  activeSecs: number;
  restSecs: number;
}

// Runtime type guard for config.
function asConfig(x: any): TimerConfig | null {
  if (x === null) {
    return null;
  }
  if (typeof x !== 'object' ||
      Object.keys(x).length !== 4 ||
      !Array.isArray(x.exercises) ||
      typeof x.numSets !== 'number' ||
      typeof x.activeSecs !== 'number' ||
      typeof x.restSecs !== 'number') {
    console.warn('Invalid saved config: ');
    console.warn(x);
    return null;
  }
  for (const e of x.exercises) {
    if (typeof e !== 'string') {
      console.warn('Invalid saved config: ');
      console.warn(x);
      return null;
    }
  }
  return (x as TimerConfig);
}

export function loadConfigFromLocalStorage(): TimerConfig {
  const parsed = asConfig(JSON.parse(localStorage.getItem('timer-config') || 'null'));
  if (parsed !== null) {
    return parsed;
  }
  const defaultTimerConfig = defaultPreset();
  saveConfigToLocalStorage(defaultTimerConfig);
  return defaultTimerConfig;
}

export function saveConfigToLocalStorage(config: TimerConfig) {
  localStorage.setItem('timer-config', JSON.stringify(config));
}

// Presets
export function defaultPreset(): TimerConfig {
  return {
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
    numSets: 1,
    activeSecs: 50,
    restSecs: 10,
  };
}

export function armsPreset(): TimerConfig {
  return {
    exercises: [
      'Bicep curls',
      'Hammer curls', 
      'Bent over bicep curls', 
      'Bent over tricep kickbacks',
      'Diamond pushups',
      'Skull crushers', 
    ],
    numSets: 3,
    activeSecs: 40,
    restSecs: 10,
  };
}

export function chestPreset(): TimerConfig {
  return {
    exercises: [
      'Dumbbell press',
      'Pec crossovers', 
      'Pinch press', 
      'Pushups',
      'Chest Fly',
      'Pinch pull-over', 
    ],
    numSets: 3,
    activeSecs: 40,
    restSecs: 10,
  };
}
