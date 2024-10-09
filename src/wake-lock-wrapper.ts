import { useWakeLock } from 'react-screen-wake-lock';

export interface WakeLockWrapper {
  isSupported: boolean,
  released: boolean | undefined,
  request: () => void,
  release: () => void,
  type?: "screen" | undefined,
}

export function useWrappedWakeLock(): WakeLockWrapper {
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
