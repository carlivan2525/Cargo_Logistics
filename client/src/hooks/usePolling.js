import { useEffect, useRef } from 'react';

/**
 * Calls `fn` immediately, then every `interval` ms while the component is mounted.
 * Stops polling when the component unmounts.
 */
export function usePolling(fn, interval = 10000) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    fnRef.current();
    const id = setInterval(() => fnRef.current(), interval);
    return () => clearInterval(id);
  }, [interval]);
}
