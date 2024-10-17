import { getPrevNext, tickAt } from './Timer';

describe('Timer state machine', () => {
  const cfg = {
    exercises: ['ex1', 'ex2'],
    numSets: 2,
    activeSecs: 5,
    restSecs: 5,
  };
  it('goes through phases in order', () => {
    const phases: [string, string][] = [];
    for (let i = 0; true; i++) {
      const t = tickAt(cfg, i);
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
  it('getPrevNext works', () => {
    let [prev, next] = getPrevNext(cfg, 0);
    expect(prev).toBeUndefined();
    expect(next).toEqual(['ex1', 'active.0.0']);
    [prev, next] = getPrevNext(cfg, 3);
    expect(prev).toEqual(['Get Ready...', 'ready']);
    expect(next).toEqual(['Rest', 'rest.0.0']);
    [prev, next] = getPrevNext(cfg, 8);
    expect(prev).toEqual(['ex1', 'active.0.0']);
    expect(next).toEqual(['ex2', 'active.0.1']);
    [prev, next] = getPrevNext(cfg, 43);
    expect(prev).toEqual(['Rest', 'rest.1.1']);
    expect(next).toBeUndefined();
  });
  it('ready phase tts, then beeping countdown', () => {
    let tick = 0;
    // TTS and beep
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'Get Ready...',
      labelKey: 'ready',
      secs: 3,
      color: 'orange',
      tts: 'Get ready',
      sfx: 'BEEP',
    });
    // Then count down with beeps
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'Get Ready...',
      labelKey: 'ready',
      secs: 2,
      color: 'orange',
      sfx: 'BEEP',
    });
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'Get Ready...',
      labelKey: 'ready',
      secs: 1,
      color: 'orange',
      sfx: 'BEEP',
    });
  });
  it('does active then rest', () => {
    let tick = 3;
    // Exercise name TTS/tick first
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'ex1',
      labelKey: 'active.0.0',
      secs: 5,
      color: 'red',
      tts: 'ex1',
      sfx: 'TICK',
    });
    // Then continue ticking
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'ex1',
      labelKey: 'active.0.0',
      secs: 4,
      color: 'red',
      sfx: 'TICK',
    });
    // Then beeping 3-2-1
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'ex1',
      labelKey: 'active.0.0',
      secs: 3,
      color: 'red',
      sfx: 'BEEP',
    });
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'ex1',
      labelKey: 'active.0.0',
      secs: 2,
      color: 'red',
      sfx: 'BEEP',
    });
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'ex1',
      labelKey: 'active.0.0',
      secs: 1,
      color: 'red',
      sfx: 'BEEP',
    });
    // Then Rest TTS/tick
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'Rest',
      labelKey: 'rest.0.0',
      secs: 5,
      color: 'green',
      tts: 'Rest',
      sfx: 'TICK',
    });
    // Then continue ticking
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'Rest',
      labelKey: 'rest.0.0',
      secs: 4,
      color: 'green',
      sfx: 'TICK',
    });
    // Then 3-2-1 beep
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'Rest',
      labelKey: 'rest.0.0',
      secs: 3,
      color: 'green',
      sfx: 'BEEP',
    });
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'Rest',
      labelKey: 'rest.0.0',
      secs: 2,
      color: 'green',
      sfx: 'BEEP',
    });
    expect(tickAt(cfg, tick++)).toEqual({
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
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'Done!',
      labelKey: 'done',
      secs: 0,
      color: 'black',
      tts: 'Done',
      sfx: 'ALARM',
      done: false,
    });
    // Every one after has no tts/sfx and is "done"
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'Done!',
      labelKey: 'done',
      secs: 0,
      color: 'black',
      done: true,
    });
    expect(tickAt(cfg, tick++)).toEqual({
      label: 'Done!',
      labelKey: 'done',
      secs: 0,
      color: 'black',
      done: true,
    });
  });
});
