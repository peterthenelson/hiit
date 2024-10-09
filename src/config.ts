
export enum Page {
  Config = 'CONFIG',
  Timer = 'TIMER',
}

export interface TimerConfig {
  // The exercises to do.
  exercises: string[];
  // TODO add configuration for active vs rest
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
    'Dumbell Swings',
    'Half-kneeling Rows',
    'Chest Fly',
    'Clamshells',
    'Chest Press',
  ],
};

