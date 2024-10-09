import { useState } from 'react';
import './App.css';
import { useWrappedWakeLock } from './wake-lock-wrapper';
import { defaultTimerConfig, Page } from './config';
import { ConfigPage } from './ConfigPage';
import { Timer } from './Timer';

function App() {
  const wakelock = useWrappedWakeLock();
  const [page, setPage] = useState(Page.Config);
  const [config, setConfig] = useState(defaultTimerConfig);
  const renderPage = () => {
    if (page === Page.Config) {
      return <ConfigPage config={config} setConfig={setConfig} setPage={setPage} />
    } else {
      console.assert(page === Page.Timer);
      return <Timer config={config} setPage={setPage} wakelock={wakelock}></Timer>;
    }
  };
  return (
    <div className='App'>
      {renderPage()}
    </div>
  );
}

export default App;
