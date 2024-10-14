import { Component, SetStateAction } from 'react';
import { Page, TimerConfig } from './config';
import { WakeLockWrapper } from './wake-lock-wrapper';
import beepSound from './beep.mp3';
import tickSound from './tick.mp3';
import alarmSound from './alarm.mp3';
import './Timer.css';
import { ArrowLeftCircleIcon, PlayPauseIcon } from '@heroicons/react/24/solid';

export interface TimerProps {
  config: TimerConfig,
  setPage: React.Dispatch<SetStateAction<Page>>,
  wakelock: WakeLockWrapper
}

export interface Tick {
  clockLabel: string;
  clockSecs: number;
  clockColor: string;
  tts?: string;
  sfx?: 'TICK' | 'BEEP' | 'ALARM';
  done?: boolean;
}

export function tickAt(config: TimerConfig, n: number): Tick {
  if (n < 3) {
    return {
      clockLabel: 'Get Ready...',
      clockSecs: 3 - n,
      clockColor: 'orange',
      tts: n === 0 ? 'Get ready' : undefined,
      sfx: 'BEEP',
    };
  }
  n -= 3;
  const exLength = config.activeSecs + config.restSecs;
  const setLength = exLength * config.exercises.length;
  const sessionLength = setLength * config.numSets;
  if (n >= sessionLength) {
    return {
      clockLabel: 'Done!',
      clockSecs: 0,
      clockColor: 'black',
      tts: n === sessionLength ? 'Done' : undefined,
      sfx: n === sessionLength ? 'ALARM' : undefined,
      done: n > sessionLength,
    };
  }
  n %= setLength;
  const ex = config.exercises[Math.floor(n / exLength)];
  n %= exLength;
  if (n < config.activeSecs) {
    return {
      clockLabel: ex,
      clockSecs: config.activeSecs - n,
      clockColor: 'red',
      tts: n === 0 ? ex : undefined,
      sfx: (config.activeSecs - n) <= 3 ? 'BEEP' : 'TICK',
    };
  }
  n -= config.activeSecs;
  return {
      clockLabel: 'Rest',
      clockSecs: config.restSecs - n,
      clockColor: 'green',
      tts: n === 0 ? 'Rest' : undefined,
      sfx: (config.restSecs - n) <= 3 ? 'BEEP' : 'TICK',
  };
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

export class Timer extends Component<TimerProps, TimerState> {
  private tickInterval: NodeJS.Timeout | null;
  private beepAudio: HTMLAudioElement;
  private tickAudio: HTMLAudioElement;
  private alarmAudio: HTMLAudioElement;
  private tickUi: Tick;

  constructor(props: TimerProps) {
    super(props);
    this.state = {
      phase: TimerPhase.Running,
      firstTick: true,
      tickCount: 0,
    };
    this.tickInterval = null;
    this.beepAudio = new Audio(beepSound);
    this.tickAudio = new Audio(tickSound);
    this.alarmAudio = new Audio(alarmSound);
    this.tickUi = tickAt(props.config, 0);
    // TODO: Is this the idiomatic thing to do?
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

  triggerAudio() {
    if (this.tickUi.tts) {
      tts(this.tickUi.tts);
    }
    if (this.tickUi.sfx === 'BEEP') {
      this.beepAudio.play();
      this.tickAudio.play();
    } else if (this.tickUi.sfx === 'TICK') {
      this.tickAudio.play();
    } else if (this.tickUi.sfx === 'ALARM') {
      this.alarmAudio.play();
    }
  }

  tick() {
    if (this.state.firstTick) {
      this.triggerAudio();
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
    this.tickUi = tickAt(this.props.config, tickCount);
    this.triggerAudio();
    if (this.tickUi.done) {
      this.clearTickInterval();
      this.props.wakelock.release();
      this.setState({ phase: TimerPhase.Done, tickCount: tickCount });
    } else {
      this.setState({ tickCount: tickCount });
    }
  };

  render() {
    const activity = this.tickUi.clockLabel;
    const color = this.tickUi.clockColor;
    const seconds = formatSeconds(this.tickUi.clockSecs);
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
        <div>
          <h3 style={{color: color}}>{activity}</h3>
          <h3 style={{color: color}}>{seconds}</h3>
        </div>
        <p>Press spacebar to start/pause the timer.</p>
      </div>
    );
  }
}
