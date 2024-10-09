import { Component, SetStateAction } from 'react';
import { Page, TimerConfig } from './config';
import { WakeLockWrapper } from './wake-lock-wrapper';
import tickSound from './tick.mp3';
import alarmSound from './alarm.mp3';

export interface TimerProps {
  config: TimerConfig,
  setPage: React.Dispatch<SetStateAction<Page>>,
  wakelock: WakeLockWrapper
}

enum TimerPhase {
  Running = 1,
  Paused,
  Done,
}

interface TimerState {
  phase: TimerPhase;

  // Internal state, reset from configuration when transitioning from
  // Configuration to Running. Updated incrementally by tick during the other
  // phases.
  totalSeconds: number;
}

function activityAt(exercises: string[], totalSeconds: number): string {
  const secs = totalSeconds % 60;
  if (totalSeconds === 0) {
    return '';
  } else if (totalSeconds > exercises.length * 60) {
    return 'Ready...';
  } else if (1 <= secs && secs <= 10) {
    return 'Rest';
  } else {
    return exercises[exercises.length - 1 - Math.floor((totalSeconds-1)/60)];
  }
}

function tts(txt: string) {
  let utt = new SpeechSynthesisUtterance(txt);
  utt.rate = 1.8;
  window.speechSynthesis.speak(utt);
}

// TODO move to a function-style component.
export class Timer extends Component<TimerProps, TimerState> {
  private tickInterval: NodeJS.Timeout | null;
  private tickAudio: HTMLAudioElement;
  private alarmAudio: HTMLAudioElement;

  constructor(props: TimerProps) {
    super(props);
    this.state = {
      phase: TimerPhase.Running,
      totalSeconds: this.props.config.exercises.length * 60 + 1,
    };
    this.tickInterval = null;
    this.tickAudio = new Audio(tickSound);
    this.alarmAudio = new Audio(alarmSound);
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

  handleSpaceBarPress = (event: KeyboardEvent) => {
    if (event.key === ' ') {
      event.preventDefault();
      this.toggleTimer();
    }
  };

  toggleTimer = () => {
    // TODO: there should be a separate button for going
    // back to the configuration.
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

  clearTickInterval = () => {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
  };

  tick = () => {
    console.log(this.props.config.exercises);
    console.log(this.state.phase);
    console.log(this.state.totalSeconds);
    const { totalSeconds } = this.state;
    if (this.state.phase === TimerPhase.Done) {
      // Only reachable by rapid pausing/unpausing. Turn off the timer but
      // don't take any user-visible actions, as they would be redundant.
      this.clearTickInterval();
    } if (totalSeconds === 0) {
      this.clearTickInterval();
      this.alarmAudio.play();
      tts('Congratulations!');
      this.props.wakelock.release();
      this.setState({ phase: TimerPhase.Done });
    } else {
      this.tickAudio.play();
      const remainder = totalSeconds % 60;
      if (remainder === 1) {
        tts(this.immanentActivity());
      } else if (remainder === 11) {
        tts('Rest');
      }
      this.setState({ totalSeconds: totalSeconds - 1 });
    }
  };

  displaySeconds = () => {
    return this.state.totalSeconds % 60;
  }

  displayColor = () => {
    if (this.state.totalSeconds === 0) {
        return 'black';
    }
    const secs = this.displaySeconds();
    if (1 <= secs && secs <= 10) {
      return 'green';
    } else {
      return 'red';
    }
  }

  // This seems kind of dumb, but if I remove it, I'll need to change a
  // bunch of other stuff to compensate.
  immanentActivity = () => {
    return activityAt(this.props.config.exercises, this.state.totalSeconds - 1);
  }

  displayActivity = () => {
    return activityAt(this.props.config.exercises, this.state.totalSeconds);
  }

  // TODO multiple buttons
  buttonText = () => {
    if (this.state.phase === TimerPhase.Running) {
      return 'Pause';
    } else if (this.state.phase === TimerPhase.Paused) {
      return 'Unpause';
    } else if(this.state.phase === TimerPhase.Done) {
      return 'DONE';
    } else {
      throw new Error(`Bad TimerPhase: ${this.state.phase}`);
    }
  };

  render = () => {
    const activity = this.displayActivity();
    const color = this.displayColor();
    const seconds = this.displaySeconds();
    return (
      <div>
        <div>
          <h1 style={{color: color}}>{activity}</h1>
          <h1 style={{color: color}}>
            00:{seconds.toString().padStart(2, '0')}
          </h1>
          <button onClick={this.toggleTimer}>{this.buttonText()}</button>
        </div>
        <p>Press spacebar to start/pause the timer.</p>
      </div>
    );
  }
}
