import { useEffect } from 'react';

export const useBodyScrollLock = (locked: boolean): void => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;

    if (locked) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [locked]);
};
