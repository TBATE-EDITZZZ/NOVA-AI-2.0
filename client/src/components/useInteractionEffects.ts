import { useCallback, useEffect, useRef, useState } from "react";

const SOUND_PREFERENCE_KEY = "discovery-engine:sfx";

export function useInteractionEffects() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SOUND_PREFERENCE_KEY);
      if (saved === "off") {
        soundEnabledRef.current = false;
        setSoundEnabled(false);
      }
    } catch {
      // Sound remains enabled for this session when local storage is unavailable.
    }
  }, []);

  const toggleSound = useCallback(() => {
    const nextValue = !soundEnabledRef.current;
    soundEnabledRef.current = nextValue;
    setSoundEnabled(nextValue);
    try {
      window.localStorage.setItem(SOUND_PREFERENCE_KEY, nextValue ? "on" : "off");
    } catch {
      // The visible control still works for this session when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest<HTMLElement>(
        'a[href],button:not(:disabled),[role="button"]:not([aria-disabled="true"]),[role="menuitem"]:not([aria-disabled="true"])'
      );
      if (!control || control.dataset.sfx === "off" || control.getAttribute("aria-disabled") === "true") return;

      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const bounds = control.getBoundingClientRect();
        const x = event.detail === 0 ? bounds.left + bounds.width / 2 : event.clientX;
        const y = event.detail === 0 ? bounds.top + bounds.height / 2 : event.clientY;
        const ripple = document.createElement("span");
        ripple.className = "interaction-ripple";
        ripple.setAttribute("aria-hidden", "true");
        ripple.style.setProperty("--ripple-x", `${x}px`);
        ripple.style.setProperty("--ripple-y", `${y}px`);
        document.body.appendChild(ripple);
        window.setTimeout(() => ripple.remove(), 700);
      }

      if (!soundEnabledRef.current || typeof window.AudioContext === "undefined") return;
      const context = audioContextRef.current ?? new window.AudioContext();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume().catch(() => undefined);

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      const isLink = control.tagName === "A";
      oscillator.type = isLink ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(isLink ? 430 : 620, now);
      oscillator.frequency.exponentialRampToValueAtTime(isLink ? 590 : 410, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.105);
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close().catch(() => undefined);
      }
    };
  }, []);

  return { soundEnabled, toggleSound };
}
