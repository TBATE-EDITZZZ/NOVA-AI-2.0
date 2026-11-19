import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const title = "TBA_TE_EDITZZZ";

type CinematicIntroProps = {
  onDismiss: () => void;
};

export default function CinematicIntro({ onDismiss }: CinematicIntroProps) {
  const reducedMotion = useReducedMotion();
  const enterButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
      } else if (event.key === "Tab") {
        event.preventDefault();
        enterButton.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    enterButton.current?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onDismiss, reducedMotion]);

  return (
    <div className={`cinematic-intro${reducedMotion ? " is-reduced" : ""}`} role="dialog" aria-modal="true" aria-labelledby="cinematic-title">
      <div className="intro-atmosphere" aria-hidden="true">
        <span className="intro-grid" />
        <span className="intro-orbit intro-orbit-a" />
        <span className="intro-orbit intro-orbit-b" />
        <span className="intro-light-sweep" />
        <span className="intro-particle intro-particle-a" />
        <span className="intro-particle intro-particle-b" />
        <span className="intro-particle intro-particle-c" />
        <span className="intro-particle intro-particle-d" />
      </div>

      <div className="intro-content">
        <div className="intro-eyebrow"><span className="intro-status-dot" /> DISCOVERY ENGINE <span className="intro-divider">/</span> A NOVA EXPERIENCE</div>
        <div className="intro-title-frame">
          <span className="intro-index intro-index-left" aria-hidden="true">01 — 07</span>
          <h1 id="cinematic-title" className="intro-title" aria-label={title}>
            {Array.from(title).map((character, index) => (
              <span
                key={`${character}-${index}`}
                className={character === "_" ? "intro-char intro-char-underscore" : "intro-char"}
                aria-hidden="true"
                style={{ "--intro-index": index } as CSSProperties}
              >
                {character}
              </span>
            ))}
          </h1>
          <span className="intro-index intro-index-right" aria-hidden="true">QUESTION → UNIVERSE</span>
        </div>
        <p className="intro-tagline">Every question opens a new universe.</p>
        <button ref={enterButton} className="intro-enter" type="button" onClick={onDismiss}>
          ENTER DISCOVERY ENGINE <ArrowUpRight size={15} aria-hidden="true" />
        </button>
        <span className="intro-hint">Press Enter, tap to continue, or wait for the reveal</span>
      </div>

      <div className="intro-edge-note" aria-hidden="true">EXPLORE <span>·</span> QUESTION <span>·</span> DISCOVER</div>
    </div>
  );
}
