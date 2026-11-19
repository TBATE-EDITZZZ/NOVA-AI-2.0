import { Link } from "wouter";

export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`brand-lockup${compact ? " brand-lockup-compact" : ""}`} aria-label="Discovery Engine home">
      <svg className="brand-symbol" viewBox="0 0 42 42" aria-hidden="true">
        <circle cx="21" cy="21" r="15.5" fill="none" stroke="currentColor" strokeOpacity=".33" />
        <ellipse cx="21" cy="21" rx="19" ry="7.4" transform="rotate(-34 21 21)" fill="none" stroke="currentColor" strokeWidth="1.35" />
        <path d="M12.4 28.5V13.7h2.1l9.8 10.7V13.7h2.8v14.8h-2.1l-9.8-10.7v10.7z" fill="currentColor" />
        <circle cx="34.5" cy="10.5" r="2.7" fill="#9d88ff" />
      </svg>
      <span className="brand-type">
        <strong>DISCOVERY<span> ENGINE</span></strong>
        {!compact && <small>NEURAL RESEARCH SYSTEM</small>}
      </span>
    </Link>
  );
}
