import { TickMap } from './Timer';

describe('Timer state machine', () => {
  const tm = new TickMap({
    exercises: ['ex1', 'ex2'],
    numSets: 2,
    activeSecs: 5,
    restSecs: 5,
  });
  it('goes through phases in order', () => {
    const phases: [string, string][] = [];
    for (let i = 0; true; i++) {
      const t = tm.get(i);
      if (phases.length === 0 || phases.at(-1)![1] !== t.labelKey) {
        phases.push([t.label, t.labelKey]);
      }
      if (t.done) {
        break;
      }
    }
    expect(phases).toEqual([
      ['Get Ready...', 'ready'],
      // Set 1
      ['ex1', 'active.0.0'],
      ['Rest', 'rest.0.0'],
      ['ex2', 'active.0.1'],
      ['Rest', 'rest.0.1'],
      // Set 2
      ['ex1', 'active.1.0'],
      ['Rest', 'rest.1.0'],
      ['ex2', 'active.1.1'],
      ['Rest', 'rest.1.1'],
      ['Done!', 'done'],
    ]);
  });
  it('previousPhase and nextPhase work', () => {
    let [prev, next] = [tm.previousPhase(0), tm.nextPhase(0)];
    expect(prev).toBeUndefined();
    expect(next).toEqual(expect.objectContaining({ labelKey: 'active.0.0' }));
    [prev, next] = [tm.previousPhase(3), tm.nextPhase(3)];
    expect(prev).toEqual(expect.objectContaining({ labelKey: 'ready' }));
    expect(next).toEqual(expect.objectContaining({ labelKey: 'rest.0.0' }));
    [prev, next] = [tm.previousPhase(8), tm.nextPhase(8)];
    expect(prev).toEqual(expect.objectContaining({ labelKey: 'active.0.0' }));
    expect(next).toEqual(expect.objectContaining({ labelKey: 'active.0.1' }));
    [prev, next] = [tm.previousPhase(43), tm.nextPhase(43)];
    expect(prev).toEqual(expect.objectContaining({ labelKey: 'rest.1.1' }));
    expect(next).toBeUndefined();
  });
  it('ready phase tts, then beeping countdown', () => {
    let tick = 0;
    // TTS and beep
    expect(tm.get(tick++)).toEqual({
      label: 'Get Ready...',
      labelKey: 'ready',
      secs: 3,
      color: 'orange',
      tts: 'Get ready',
      sfx: 'BEEP',
    });
    // Then count down with beeps
    expect(tm.get(tick++)).toEqual({
      label: 'Get Ready...',
      labelKey: 'ready',
      secs: 2,
      color: 'orange',
      sfx: 'BEEP',
    });
    expect(tm.get(tick++)).toEqual({
      label: 'Get Ready...',
      labelKey: 'ready',
      secs: 1,
      color: 'orange',
      sfx: 'BEEP',
    });
  });
  it('does active then rest', () => {
    let tick = 3;
    // Exercise name TTS/start first
    expect(tm.get(tick++)).toEqual({
      label: 'ex1',
      labelKey: 'active.0.0',
      secs: 5,
      color: 'red',
      tts: 'ex1',
      sfx: 'START',
    });
    // Then tick
    expect(tm.get(tick++)).toEqual({
      label: 'ex1',
      labelKey: 'active.0.0',
      secs: 4,
      color: 'red',
      sfx: 'TICK',
    });
    // Then beeping 3-2-1
    expect(tm.get(tick++)).toEqual({
      label: 'ex1',
      labelKey: 'active.0.0',
      secs: 3,
      color: 'red',
      sfx: 'BEEP',
    });
    expect(tm.get(tick++)).toEqual({
      label: 'ex1',
      labelKey: 'active.0.0',
      secs: 2,
      color: 'red',
      sfx: 'BEEP',
    });
    expect(tm.get(tick++)).toEqual({
      label: 'ex1',
      labelKey: 'active.0.0',
      secs: 1,
      color: 'red',
      sfx: 'BEEP',
    });
    // Then Rest TTS/start
    expect(tm.get(tick++)).toEqual({
      label: 'Rest',
      labelKey: 'rest.0.0',
      secs: 5,
      color: 'green',
      tts: 'Rest',
      sfx: 'START',
    });
    // Then tick
    expect(tm.get(tick++)).toEqual({
      label: 'Rest',
      labelKey: 'rest.0.0',
      secs: 4,
      color: 'green',
      sfx: 'TICK',
    });
    // Then 3-2-1 beep
    expect(tm.get(tick++)).toEqual({
      label: 'Rest',
      labelKey: 'rest.0.0',
      secs: 3,
      color: 'green',
      sfx: 'BEEP',
    });
    expect(tm.get(tick++)).toEqual({
      label: 'Rest',
      labelKey: 'rest.0.0',
      secs: 2,
      color: 'green',
      sfx: 'BEEP',
    });
    expect(tm.get(tick++)).toEqual({
      label: 'Rest',
      labelKey: 'rest.0.0',
      secs: 1,
      color: 'green',
      sfx: 'BEEP',
    });
  });
  it('permanently ends in done', () => {
    let tick = 43;
    // Exactly at the count
    expect(tm.get(tick++)).toEqual({
      label: 'Done!',
      labelKey: 'done',
      secs: 0,
      color: 'black',
      tts: 'Done',
      sfx: 'ALARM',
      done: false,
    });
    // Every one after has no tts/sfx and is "done"
    expect(tm.get(tick++)).toEqual({
      label: 'Done!',
      labelKey: 'done',
      secs: 0,
      color: 'black',
      done: true,
    });
    expect(tm.get(tick++)).toEqual({
      label: 'Done!',
      labelKey: 'done',
      secs: 0,
      color: 'black',
      done: true,
    });
  });
});
