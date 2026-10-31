import { useEffect, useRef, useState } from 'react';

const storageKey = 'pomodoro-alerts';
const readEnabled = () => {
  try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
};

/** A short two-tone chime made in the browser, so no sound file is downloaded. */
const chime = () => {
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  [660, 880].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.18;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.32);
  });
  window.setTimeout(() => void context.close(), 1000);
};

/**
 * While the timer runs, the tab title shows the time left. When the server moves the timer to another phase, an
 * opted-in browser plays a chime, vibrates and, if the tab is hidden and notifications are allowed, shows one.
 * The choice is kept per browser.
 */
export function usePomodoroAlerts({ phaseKey, phaseName, timeLeft, isRunning, title }: {
  phaseKey: string;
  phaseName: string;
  timeLeft: string;
  isRunning: boolean;
  title: string;
}) {
  const [enabled, setEnabledState] = useState(readEnabled);
  const previous = useRef(phaseKey);

  useEffect(() => {
    if (previous.current === phaseKey) return;
    previous.current = phaseKey;
    if (!enabled) return;
    try { chime(); } catch { /* Audio may be blocked until the page is used. */ }
    navigator.vibrate?.(200);
    if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted')
      new Notification(phaseName, { body: title, tag: 'pomodoro-phase' });
  }, [phaseKey, enabled, phaseName, title]);

  useEffect(() => {
    if (!isRunning) return;
    const original = document.title;
    return () => { document.title = original; };
  }, [isRunning]);
  useEffect(() => {
    if (isRunning) document.title = `${timeLeft} · ${phaseName}`;
  }, [isRunning, timeLeft, phaseName]);

  const setEnabled = (value: boolean) => {
    setEnabledState(value);
    try { localStorage.setItem(storageKey, value ? '1' : '0'); } catch { /* Storage is optional. */ }
    if (value && 'Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
  };
  return { enabled, setEnabled };
}
