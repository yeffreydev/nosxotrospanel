import { useEffect, useState } from 'react';
import { subscribeQueue, queueCount } from '../lib/offline';

export function useOnline(): boolean {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function useQueueCount(): number {
  const [count, setCount] = useState(queueCount());
  useEffect(() => {
    const update = () => setCount(queueCount());
    update();
    return subscribeQueue(update);
  }, []);
  return count;
}
