import { Component } from 'react';
import { useWakeLock } from 'react-screen-wake-lock';
import './App.css';
import tickSound from './tick.mp3';
import alarmSound from './alarm.mp3'

interface WakeLockWrapper {
  isSupported: boolean,
  released: boolean | undefined,
  request: () => void,
  release: () => void,
  type?: "screen" | undefined,
}

function useWrappedWakeLock(): WakeLockWrapper {
  const lock = useWakeLock({
    onRequest: () => console.log('Screen wake lock requested'),
    onError: () => console.log('Screen wake lock error'),
    onRelease: () => console.log('Screen wake lock released'),
  });
  if (!lock.isSupported) {
    console.warn('Screen wake lock not supported!');
  }
  return {
    isSupported: lock.isSupported,
    released: lock.released,
    request: () => {
      lock.request().then(
        () => console.log('Screen wake lock acquired.'));
    },
    release: () => {
      lock.release();
    },
    type: lock.type
  };
}

enum HiitTimerPhase {
  Configuration = 1,
  Running,
  Paused,
  Done,
}

interface HiitTimerProps {
  wakelock: WakeLockWrapper
}

interface HiitTimerState {
  phase: HiitTimerPhase;

  // Configuration Phase
  exerciseText: string;

  // Internal state, reset from configuration when transitioning from
  // Configuration to Running. Updated incrementally by tick during the other
  // phases.
  exercises: string[];
  totalSeconds: number;
}

function activityAt(exercises: string[], totalSeconds: number): string {
  const secs = totalSeconds % 60;
  if (totalSeconds > exercises.length * 60) {
    return 'Ready...';
  } else if (1 <= secs && secs <= 10) {
    return 'Rest';
  } else {
    return exercises[Math.floor((totalSeconds-1)/60)];
  }
}

const defaultText = (
  'Lat pulls\n' +
  'Face pulls\n' +
  'Rows\n' +
  'Lateral Raises\n' +
  'Jumping Jacks\n' +
  'Shoulder Shrugs\n' +
  'Overhead Press\n' +
  'Bicep Curls\n' +
  'Lunges\n' +
  'Sumo Squats\n' +
  'Dumbell Swings\n' +
  'Half-kneeling Rows\n' +
  'Chest Fly\n' +
  'Clamshells\n' +
  'Chest Press');

class HiitTimer extends Component<HiitTimerProps, HiitTimerState> {
  private tickInterval: NodeJS.Timeout | null;
  private tickAudio: HTMLAudioElement;
  private alarmAudio: HTMLAudioElement;

  constructor(props: HiitTimerProps) {
    super(props);
    this.state = {
      phase: HiitTimerPhase.Configuration,
      exerciseText: defaultText,
      exercises: [],
      totalSeconds: 0,
    };
    this.tickInterval = null;
    this.tickAudio = new Audio(tickSound);
    this.alarmAudio = new Audio(alarmSound);
  }

  componentDidMount() {
    // I don't think we need anything here.
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleSpaceBarPress);
    this.clearTickInterval();
    this.props.wakelock.release();
  }

  tts = (txt: string) => {
    let utt = new SpeechSynthesisUtterance(txt);
    utt.rate = 1.8;
    window.speechSynthesis.speak(utt);
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
    if (this.state.phase === HiitTimerPhase.Configuration) {
      this.startTimer();
    } else if (this.state.phase === HiitTimerPhase.Running) {
      this.stopTimer();
    } else if (this.state.phase === HiitTimerPhase.Paused) {
      this.unpauseTimer();
    } else if(this.state.phase === HiitTimerPhase.Done) {
      // Do nothing
    } else {
      throw new Error(`Bad HiitTimerPhase: ${this.state.phase}`);
    }
  };

  startTimer = () => {
    let ex = this.state.exerciseText.split('\n').filter(Boolean).reverse();
    let total = ex.length * 60 + 1;
    this.setState({
       phase: HiitTimerPhase.Running, exercises: ex, totalSeconds: total
      }, () => {
      this.tick();
      this.tickInterval = setInterval(this.tick, 1000);
    });
    document.addEventListener('keydown', this.handleSpaceBarPress);
    this.props.wakelock.request();
  };

  stopTimer = () => {
    this.clearTickInterval();
    this.setState({ phase: HiitTimerPhase.Paused });
  };

  unpauseTimer = () => {
    this.setState({ phase: HiitTimerPhase.Running }, () => {
      this.tick();
      this.tickInterval = setInterval(this.tick, 1000);
    });
  };

  clearTickInterval = () => {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
  };

  tick = () => {
    const { totalSeconds } = this.state;
    if (this.state.phase === HiitTimerPhase.Done) {
      // Only reachable by rapid pausing/unpausing. Turn off the timer but
      // don't take any user-visible actions, as they would be redundant.
      this.clearTickInterval();
    } if (totalSeconds === 0) {
      this.clearTickInterval();
      this.alarmAudio.play();
      this.tts('Congratulations!');
      this.props.wakelock.release();
      this.setState({ phase: HiitTimerPhase.Done });
    } else {
      this.tickAudio.play();
      const remainder = totalSeconds % 60;
      if (remainder === 1) {
        this.tts(this.immanentActivity());
      } else if (remainder === 11) {
        this.tts('Rest');
      }
      this.setState({ totalSeconds: totalSeconds - 1 });
    }
  };

  handleText = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ exerciseText: event.target.value });
  }

  displaySeconds = () => {
    return this.state.totalSeconds % 60;
  }

  displayColor = () => {
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
    return activityAt(this.state.exercises, this.state.totalSeconds - 1);
  }

  displayActivity = () => {
    return activityAt(this.state.exercises, this.state.totalSeconds);
  }

  // TODO multiple buttons
  buttonText = () => {
    if (this.state.phase === HiitTimerPhase.Configuration) {
      return 'Start';
    } else if (this.state.phase === HiitTimerPhase.Running) {
      return 'Pause';
    } else if (this.state.phase === HiitTimerPhase.Paused) {
      return 'Unpause';
    } else if(this.state.phase === HiitTimerPhase.Done) {
      return 'DONE';
    } else {
      throw new Error(`Bad HiitTimerPhase: ${this.state.phase}`);
    }
  };

  renderConfig = () => {
    return (
      <div>
        <div>
          <h1>HIIT Timer</h1>
          <textarea
           value={this.state.exerciseText}
           onChange={this.handleText}/>
          <p></p>
          <button onClick={this.toggleTimer}>{this.buttonText()}</button>
        </div>
      </div>
    );
  }

  renderTimer = () => {
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

  render = () => {
    if (this.state.phase === HiitTimerPhase.Configuration) {
      return this.renderConfig();
    } else {
      return this.renderTimer();
    }
  }
}

function App() {
  const wakelock = useWrappedWakeLock();
  return (
    <div className='App'>
      <HiitTimer wakelock={wakelock}></HiitTimer>
    </div>
  );
}

export default App;
