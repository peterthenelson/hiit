import { SetStateAction, useState } from 'react';
import { Page, TimerConfig } from './config';

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

export interface ConfigPageProps {
  config: TimerConfig,
  setConfig: React.Dispatch<SetStateAction<TimerConfig>>,
  setPage: React.Dispatch<SetStateAction<Page>>;
}

export function ConfigPage({ config, setConfig, setPage }: ConfigPageProps) {
  const [exerciseText, setExerciseText] = useState(defaultText);
  const handleText = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const et = event.target.value;
    setExerciseText(et);
    setConfig({ exercises: et.split('\n').filter(Boolean) });
  }
  return (
    <div>
      <div>
        <h1>HIIT Timer</h1>
        <textarea
         value={exerciseText}
         onChange={handleText}/>
        <p></p>
        <button onClick={() => setPage(Page.Timer)}>Start</button>
      </div>
    </div>
  );
}
