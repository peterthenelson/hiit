import { Component, SetStateAction } from 'react';
import { Page, TimerConfig } from './config';
import { WakeLockWrapper } from './wake-lock-wrapper';
import alarmSound from './alarm.mp3';
import beepSound from './beep.mp3';
import startSound from './start.mp3';
import tickSound from './tick.mp3';
import './Timer.css';
import { ArrowLeftCircleIcon, PlayPauseIcon } from '@heroicons/react/24/solid';

export interface TimerProps {
  config: TimerConfig,
  setPage: React.Dispatch<SetStateAction<Page>>,
  wakelock: WakeLockWrapper
}

export interface Tick {
  label: string;
  labelKey: string;
  secs: number;
  color: string;
  progress: number;
  tts?: string;
  sfx?: 'START' | 'TICK' | 'BEEP' | 'ALARM';
  done?: boolean;
}

export class TickMap {
  private ticks: Tick[] = [];

  constructor(config: TimerConfig) {
    this.ticks = [];
    for (let i = 0; i < 5; i++) {
      this.ticks.push({
        label: 'Get Ready...',
        labelKey: 'ready',
        secs: 5 - i,
        progress: i / 5,
        color: 'orange',
        tts: i === 0 ? 'Get ready' : undefined,
        sfx: 'BEEP',
      });
    }
    for (let setIdx = 0; setIdx < config.numSets; setIdx++) {
      for (let exIdx = 0; exIdx < config.exercises.length; exIdx++) {
        const ex = config.exercises[exIdx];
        for (let i = 0; i < config.activeSecs; i++) {
          this.ticks.push({
            label: ex,
            labelKey: `active.${setIdx}.${exIdx}`,
            secs: config.activeSecs - i,
            progress: i / config.activeSecs,
            color: 'red',
            tts: i === 0 ? ex : undefined,
            sfx: i === 0 ? 'START' : ((config.activeSecs - i) <= 3 ? 'BEEP' : 'TICK'),
          });
        }
        for (let i = 0; i < config.restSecs; i++) {
          this.ticks.push({
            label: 'Rest',
            labelKey: `rest.${setIdx}.${exIdx}`,
            secs: config.restSecs - i,
            progress: i / config.restSecs,
            color: 'green',
            tts: i === 0 ? 'Rest' : undefined,
            sfx: i === 0 ? 'START' : ((config.restSecs - i) <= 3 ? 'BEEP' : 'TICK'),
          });
        }
      }
    }
    for (let i = 0; i < 2; i++) {
      this.ticks.push({
        label: 'Done!',
        labelKey: 'done',
        secs: 0,
        progress: 1.0,
        color: 'black',
        tts: i === 0 ? 'Done' : undefined,
        sfx: i === 0 ? 'ALARM' : undefined,
        done: i > 0,
      });
    }
  }

  get(n: number): Tick {
    if (n >= this.ticks.length) {
      return this.ticks.at(-1)!;
    } else if (n < 0) {
      throw new Error(`Invalid tick: ${n}`);
    }
    return this.ticks[n];
  }

  previousPhase(n: number): Tick | undefined {
    const current = this.get(n);
    for (let i = n - 1; i >= 0; i--) {
      const earlier = this.get(i);
      if (earlier.labelKey !== current.labelKey) {
        return earlier;
      }
    }
    return undefined;
  }

  nextPhase(n: number): Tick | undefined {
    const current = this.get(n);
    for (let i = n + 1; true; i++) {
      const later = this.get(i);
      if (later.labelKey !== current.labelKey) {
        return later;
      } else if (later.done) {
        break;
      }
    }
    return undefined;
  }
}

enum TimerPhase {
  Running = 1,
  Paused,
  Done,
}

interface TimerState {
  phase: TimerPhase;
  firstTick: boolean;
  tickCount: number;
}

function tts(txt: string) {
  let utt = new SpeechSynthesisUtterance(txt);
  utt.rate = 1.8;
  window.speechSynthesis.speak(utt);
}

function formatSeconds(secs: number) {
  let s = '';
  if (secs > 3600) {
    s += Math.floor(secs/3600).toString() + ':';
    secs %= 3600;
  }
  s += Math.floor(secs/60).toString().padStart(2, '0') + ':';
  secs %= 60;
  s += secs.toString().padStart(2, '0');
  return s;
}

function lerp(a: number, b: number, t: number): number {
  return (a + (b-a)*t);
}

export class Timer extends Component<TimerProps, TimerState> {
  private tickInterval: NodeJS.Timeout | null;
  private alarmAudio: HTMLAudioElement;
  private beepAudio: HTMLAudioElement;
  private startAudio: HTMLAudioElement;
  private tickAudio: HTMLAudioElement;
  private tickMap: TickMap;

  constructor(props: TimerProps) {
    super(props);
    this.state = {
      phase: TimerPhase.Running,
      firstTick: true,
      tickCount: 0,
    };
    this.tickInterval = null;
    this.alarmAudio = new Audio(alarmSound);
    this.beepAudio = new Audio(beepSound);
    this.startAudio = new Audio(startSound);
    this.tickAudio = new Audio(tickSound);
    this.tickMap = new TickMap(props.config);
    this.tick = this.tick.bind(this);
    this.toggleTimer = this.toggleTimer.bind(this);
    this.handleSpaceBarPress = this.handleSpaceBarPress.bind(this);
  }
  
  componentDidMount() {
    document.addEventListener('keydown', this.handleSpaceBarPress);
    this.props.wakelock.request();
    this.tickInterval = setInterval(this.tick, 1000);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleSpaceBarPress);
    this.clearTickInterval();
    this.props.wakelock.release();
  }

  handleSpaceBarPress(event: KeyboardEvent) {
    if (event.key === ' ') {
      event.preventDefault();
      this.toggleTimer();
    }
  };

  toggleTimer() {
    if (this.state.phase === TimerPhase.Running) {
      this.clearTickInterval();
      this.setState({ phase: TimerPhase.Paused });
    } else if (this.state.phase === TimerPhase.Paused) {
      this.setState({ phase: TimerPhase.Running }, () => {
        this.tick();
        this.tickInterval = setInterval(this.tick, 1000);
      });
    } else if(this.state.phase === TimerPhase.Done) {
      // Do nothing
    } else {
      throw new Error(`Bad TimerPhase: ${this.state.phase}`);
    }
  };

  clearTickInterval() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
  };

  triggerAudio(tickCount: number) {
    const current = this.tickMap.get(tickCount);
    if (current.tts) {
      tts(current.tts);
    }
    if (current.sfx === 'START') {
      this.startAudio.play();
      this.tickAudio.play();
    } else if (current.sfx === 'TICK') {
      this.tickAudio.play();
    } else if (current.sfx === 'BEEP') {
      this.beepAudio.play();
      this.tickAudio.play();
    } else if (current.sfx === 'ALARM') {
      this.alarmAudio.play();
    }
  }

  tick() {
    if (this.state.firstTick) {
      this.triggerAudio(0);
      this.setState({ firstTick: false });
      return;
    }
    if (this.state.phase === TimerPhase.Done) {
      // Only reachable by rapid pausing/unpausing. Turn off the timer but
      // don't take any user-visible actions, as they would be redundant.
      this.clearTickInterval();
      return;
    }
    const tickCount = this.state.tickCount + 1;
    this.triggerAudio(tickCount);
    if (this.tickMap.get(tickCount).done) {
      this.clearTickInterval();
      this.props.wakelock.release();
      this.setState({ phase: TimerPhase.Done, tickCount: tickCount });
    } else {
      this.setState({ tickCount: tickCount });
    }
  };

  render() {
    const current = this.tickMap.get(this.state.tickCount);
    const prev = this.tickMap.previousPhase(this.state.tickCount);
    const next = this.tickMap.nextPhase(this.state.tickCount);
    const col = lerp(230, 190, current.progress);
    const secondsOverrides = {
      borderColor: `rgb(${col}, ${col}, ${col})`,
    };
    const outerOverrides = {
      backgroundColor: `rgb(${col}, ${col}, ${col})`,
    };
    return (
      <div className="Timer">
        <h2>HIIT Timer</h2>
        <div className="Timer-buttons">
          <button
            onClick={() => this.props.setPage(Page.Config)}
            className="Timer-exit" title="Exit Timer"
          >
            <ArrowLeftCircleIcon pointerEvents="none" />
          </button>
          <button
            onClick={() => this.toggleTimer()}
            className="Timer-pause" title="Play/Pause Timer"
          >
            <PlayPauseIcon pointerEvents="none" />
          </button>
        </div>
        <div className="Timer-face" key={current.labelKey + '-face'}>
          <div className="Timer-item Timer-current" key={current.labelKey}>
            <div className="Timer-text" style={{color: current.color}}>
              {current.label}
            </div>
          </div>
          <div className="Timer-item Timer-current-old" key={prev?.labelKey || 'no-current-old'}>
            <div className="Timer-text" style={{color: prev?.color || 'black'}}>
              {prev?.label || ''}
            </div>
          </div>
          <div className="Timer-item Timer-seconds" key={current.labelKey + '-secs'}>
            <div className="Timer-text">{formatSeconds(current.secs)}</div>
          </div>
          <div className="Timer-seconds-border" style={secondsOverrides}></div>
          <div className="Timer-item Timer-next-old" key={prev ? current.labelKey + '-next-old' : 'no-next-old'}>
            <div className="Timer-text">{prev ? 'Next: ' + current.label : ''}</div>
          </div>
          <div className="Timer-item Timer-next" key={next?.labelKey || 'no-next'}>
            <div className="Timer-text">{next ? 'Next: ' + next.label : ''}</div>
          </div>
          <div className="Timer-inner-circle"></div>
          <div className="Timer-outer-circle" style={outerOverrides}></div>
        </div>
        <p>Press spacebar to start/pause the timer.</p>
      </div>
    );
  }
}
