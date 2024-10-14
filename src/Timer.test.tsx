import { tickAt } from './Timer';

describe('Timer state machine', () => {
  const cfg = {
    exercises: ['ex1', 'ex2'],
    numSets: 2,
    activeSecs: 5,
    restSecs: 5,
  };
  it('goes through phases in order', () => {
    const phases: string[] = [];
    for (let i = 0; true; i++) {
      const t = tickAt(cfg, i);
      if (phases.length === 0 || phases.at(-1)! !== t.clockLabel) {
        phases.push(t.clockLabel);
      }
      if (t.done) {
        break;
      }
    }
    expect(phases).toEqual([
      'Get Ready...',
      'ex1', 'Rest', 'ex2', 'Rest', // Set 1
      'ex1', 'Rest', 'ex2', 'Rest', // Set 2
      'Done!',
    ]);
  });
  it('ready phase tts, then beeping countdown', () => {
    let tick = 0;
    // TTS and beep
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'Get Ready...',
      clockSecs: 3,
      clockColor: 'orange',
      tts: 'Get ready',
      sfx: 'BEEP',
    });
    // Then count down with beeps
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'Get Ready...',
      clockSecs: 2,
      clockColor: 'orange',
      sfx: 'BEEP',
    });
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'Get Ready...',
      clockSecs: 1,
      clockColor: 'orange',
      sfx: 'BEEP',
    });
  });
  it('does active then rest', () => {
    let tick = 3;
    // Exercise name TTS/tick first
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'ex1',
      clockSecs: 5,
      clockColor: 'red',
      tts: 'ex1',
      sfx: 'TICK',
    });
    // Then continue ticking
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'ex1',
      clockSecs: 4,
      clockColor: 'red',
      sfx: 'TICK',
    });
    // Then beeping 3-2-1
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'ex1',
      clockSecs: 3,
      clockColor: 'red',
      sfx: 'BEEP',
    });
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'ex1',
      clockSecs: 2,
      clockColor: 'red',
      sfx: 'BEEP',
    });
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'ex1',
      clockSecs: 1,
      clockColor: 'red',
      sfx: 'BEEP',
    });
    // Then Rest TTS/tick
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'Rest',
      clockSecs: 5,
      clockColor: 'green',
      tts: 'Rest',
      sfx: 'TICK',
    });
    // Then continue ticking
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'Rest',
      clockSecs: 4,
      clockColor: 'green',
      sfx: 'TICK',
    });
    // Then 3-2-1 beep
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'Rest',
      clockSecs: 3,
      clockColor: 'green',
      sfx: 'BEEP',
    });
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'Rest',
      clockSecs: 2,
      clockColor: 'green',
      sfx: 'BEEP',
    });
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'Rest',
      clockSecs: 1,
      clockColor: 'green',
      sfx: 'BEEP',
    });
  });
  it('permanently ends in done', () => {
    let tick = 43;
    // Exactly at the count
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'Done!',
      clockSecs: 0,
      clockColor: 'black',
      tts: 'Done',
      sfx: 'ALARM',
      done: false,
    });
    // Every one after has no tts/sfx and is "done"
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'Done!',
      clockSecs: 0,
      clockColor: 'black',
      done: true,
    });
    expect(tickAt(cfg, tick++)).toEqual({
      clockLabel: 'Done!',
      clockSecs: 0,
      clockColor: 'black',
      done: true,
    });
  });
});
