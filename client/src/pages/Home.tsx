import { lazy, Suspense, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Atom, Compass, FlaskConical, Globe2, Orbit, Search, Sparkles, Telescope } from "lucide-react";
import { trpc } from "@/lib/trpc";

const SolarSystem = lazy(() => import("@/components/science/SolarSystem"));

const topicCards = [
  { icon: Atom, title: "Matter & energy", label: "PHYSICS · CHEMISTRY", href: "/explorer" },
  { icon: Globe2, title: "Life on Earth", label: "BIOLOGY · ECOLOGY", href: "/explorer" },
  { icon: Orbit, title: "Worlds beyond", label: "ASTRONOMY · SPACE", href: "/explorer" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [question, setQuestion] = useState("");
  const [showOrbit, setShowOrbit] = useState(false);
  const quakes = trpc.science.earthquakes.useQuery(undefined, { staleTime: 60_000, refetchInterval: 60_000 });
  const papers = trpc.science.papers.useQuery({ query: "astronomy" }, { staleTime: 300_000 });

  function explore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (!value) return;
    setLocation(`/nova?question=${encodeURIComponent(value)}`);
  }

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> SCIENCE, WITHOUT BOUNDARIES <span className="eyebrow-index">01 / 09</span></div>
          <h1>THE UNIVERSE<br />IS FULL OF <em>QUESTIONS.</em></h1>
          <p className="hero-lede">Discover the unknown with an intelligent scientific research engine designed to explore, explain and understand our world.</p>
          <form className="hero-search" onSubmit={explore}>
            <Search size={19} aria-hidden="true" />
            <input value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask a question about anything…" aria-label="Search anything scientific" />
            <button type="submit" aria-label="Ask NOVA"><ArrowUpRight size={18} /></button>
          </form>
          <div className="hero-actions">
            <Link className="button-primary" href="/nova"><Sparkles size={16} /> Ask NOVA <ArrowUpRight size={15} /></Link>
            <Link className="button-quiet" href="/explorer">Start discovering <ArrowRight size={15} /></Link>
          </div>
          <div className="hero-micro"><span className="status-dot" /> RESEARCH WITH TRACEABLE SOURCES <span className="micro-separator">/</span> CURIOUS BY DESIGN</div>
        </div>
        <div className="hero-image-credit">NASA · ESA · CSA · STScI <span>“Cosmic Cliffs,” NGC 3324 · 2022</span></div>
        <a className="hero-scroll" href="#discover" aria-label="Scroll to featured discoveries"><ArrowDownRight size={17} /> SCROLL TO EXPLORE</a>
        <div className="hero-side-label">OBSERVATION NO. 001 — A STAR-FORMING REGION</div>
      </section>

      <section className="signal-strip" aria-label="Live science status">
        <div className="signal-intro"><span className="signal-pulse" /> FIELD SIGNALS <span>·</span></div>
        <div className="signal-item"><span className="signal-label">USGS · LAST 24H</span><strong>{quakes.data ? quakes.data.count.toLocaleString() : quakes.isLoading ? "…" : "—"}</strong><span className="signal-sub">earthquakes recorded</span></div>
        <div className="signal-item"><span className="signal-label">RESEARCH INDEX</span><strong>{papers.data?.sources.length ?? (papers.isLoading ? "…" : "—")}</strong><span className="signal-sub">sample records available</span></div>
        <div className="signal-item"><span className="signal-label">NOVA STATUS</span><strong className="nova-status-word">READY TO QUESTION</strong><span className="signal-sub">Gemini-backed · server-side</span></div>
        <div className="signal-time">{quakes.data ? `Retrieved ${new Date(quakes.data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Waiting for source data"}</div>
      </section>

      <section className="section-block discovery-intro" id="discover">
        <div className="section-kicker"><span>01</span> A DIFFERENT WAY TO LOOK</div>
        <div className="intro-split">
          <h2>Curiosity is the<br /><span>beginning of method.</span></h2>
          <p>One connected space to ask, investigate, model and understand. NOVA helps make the path from question to evidence easier to follow.</p>
        </div>
        <div className="feature-line">
          <div className="feature-image-wrap"><img src="/images/cosmic-cliffs.webp" alt="Infrared view of the Cosmic Cliffs in the Carina Nebula, a star-forming region observed by Webb" loading="lazy" /><div className="image-caption"><span>FIELD NOTE / 001</span><span>NGC 3324 · 7,600 LIGHT-YEARS</span></div></div>
          <div className="feature-copy">
            <span className="card-kicker">FEATURED OBSERVATION · 12 JUL 2022</span>
            <h3>Where stars<br />take their first breath.</h3>
            <p>Webb’s infrared view of the Cosmic Cliffs reveals previously obscured regions of star birth. The colors in this image are assigned to infrared filters; they are not what the scene would look like to human eyes.</p>
            <a className="text-link" href="https://science.nasa.gov/asset/webb/cosmic-cliffs-in-the-carina-nebula-nircam-image/" target="_blank" rel="noreferrer">Read the NASA image record <ArrowUpRight size={14} /></a>
            <div className="credit-line">IMAGE: NASA, ESA, CSA, STScI · HISTORICAL IMAGE, NOT LIVE DATA</div>
          </div>
        </div>
      </section>

      <section className="section-block topic-section">
        <div className="section-heading-row"><div><div className="section-kicker"><span>02</span> CHOOSE A DIRECTION</div><h2>Science has no<br /><span>single doorway.</span></h2></div><Link className="text-link" href="/explorer">Open the Explorer <ArrowRight size={15} /></Link></div>
        <div className="topic-cards">
          {topicCards.map(({ icon: Icon, title, label, href }, index) => <Link href={href} className="topic-card" key={title}>
            <span className="topic-number">0{index + 1}</span><Icon size={22} strokeWidth={1.5} /><span className="topic-label">{label}</span><strong>{title}</strong><span className="topic-arrow"><ArrowUpRight size={16} /></span>
          </Link>)}
        </div>
        <div className="topic-rail"><span>ALSO IN THE EXPLORER</span><Link href="/explorer">Quantum physics</Link><Link href="/explorer">Genetics</Link><Link href="/explorer">Ocean science</Link><Link href="/explorer">Cosmology</Link><Link href="/explorer">+ MORE TOPICS</Link></div>
      </section>

      <section className="section-block nova-feature">
        <div className="nova-orbit-art" aria-hidden="true"><div className="nova-orbit-ring ring-a" /><div className="nova-orbit-ring ring-b" /><div className="nova-core">N</div><div className="nova-star star-a" /><div className="nova-star star-b" /></div>
        <div className="nova-feature-copy"><div className="section-kicker"><span>03</span> YOUR RESEARCH COMPANION</div><h2>Meet <span>NOVA.</span><br />Question further.</h2><p>From a quick explanation to a source-backed research brief, NOVA makes its mode, evidence and limits visible. Citations appear only when a real source lookup returns them.</p><div className="nova-mode-list"><span>QUICK ANSWER</span><span>DEEP RESEARCH</span><span>EXPLAIN SIMPLY</span><span>COMPARE EVIDENCE</span></div><Link href="/nova" className="button-primary">Open NOVA <ArrowUpRight size={15} /></Link></div>
        <div className="nova-feature-index">NEURAL OBSERVATION<br />&amp; VERIFICATION ASSISTANT</div>
      </section>

      <section className="section-block signal-lab-section">
        <div className="section-heading-row"><div><div className="section-kicker"><span>04</span> FROM THEORY TO MOTION</div><h2>Enter the<br /><span>virtual lab.</span></h2></div><Link className="text-link" href="/laboratory">Explore experiments <ArrowRight size={15} /></Link></div>
        <div className="lab-preview-card">
          <div className="lab-preview-copy"><span className="card-kicker">PHYSICS LAB · INTERACTIVE MODEL</span><h3>Change a variable.<br />See what moves.</h3><p>Explore ideal projectile motion by changing launch speed and angle. This is a mathematical simulation without air resistance—not a physical measurement.</p><Link className="button-outline" href="/laboratory"><FlaskConical size={16} /> Open the laboratory <ArrowUpRight size={15} /></Link></div>
          <div className="lab-preview-visual"><div className="lab-trajectory"><svg viewBox="0 0 520 250" role="img" aria-label="Illustrative curved projectile trajectory"><defs><linearGradient id="traj" x1="0" x2="1"><stop stopColor="#9882ff" /><stop offset="1" stopColor="#5ce6dc" /></linearGradient></defs><path d="M32 216 C126 25 290 10 488 216" fill="none" stroke="url(#traj)" strokeWidth="2.5" strokeDasharray="5 8" /><circle cx="32" cy="216" r="6" fill="#fff" /><circle cx="488" cy="216" r="4" fill="#5ce6dc" /><path d="M24 220H500" stroke="rgba(255,255,255,.18)" /></svg><span className="trajectory-tag tag-one">v₀</span><span className="trajectory-tag tag-two">g</span><div className="trajectory-grid" /></div><span className="visual-caption">MODEL / IDEAL TRAJECTORY · NOT TO SCALE</span></div>
        </div>
      </section>

      <section className="section-block orbit-preview-section">
        <div className="section-heading-row"><div><div className="section-kicker"><span>05</span> A SMALL ORBITAL STUDY</div><h2>Worlds in<br /><span>motion.</span></h2></div><button className="button-outline" onClick={() => setShowOrbit(value => !value)}><Orbit size={16} /> {showOrbit ? "Close the model" : "Open interactive model"}</button></div>
        {showOrbit ? <Suspense fallback={<div className="loading-panel">Preparing the 3D scene…</div>}><SolarSystem /></Suspense> : <div className="orbit-prompt"><Telescope size={21} /><span>Rotate, zoom and inspect a scale-distorted educational solar-system model.</span><button onClick={() => setShowOrbit(true)}>Load Three.js scene <ArrowRight size={15} /></button></div>}
      </section>

      <section className="section-block paper-section">
        <div className="section-heading-row"><div><div className="section-kicker"><span>06</span> RESEARCH, WITH A SOURCE TRAIL</div><h2>Follow the<br /><span>published record.</span></h2></div><Link className="text-link" href="/research">Search research metadata <ArrowRight size={15} /></Link></div>
        <div className="paper-list">
          {papers.data?.sources.slice(0, 3).map((paper, index) => <a key={paper.url} className="paper-row" href={paper.url} target="_blank" rel="noreferrer"><span className="paper-ordinal">0{index + 1}</span><span className="paper-title">{paper.title}</span><span className="paper-meta">{paper.publisher || "Publisher not listed"}{paper.publishedAt ? ` · ${paper.publishedAt.slice(0, 4)}` : ""}</span><ArrowUpRight size={15} /></a>)}
          {papers.isLoading && <div className="empty-line">Connecting to Crossref research metadata…</div>}
          {papers.error && <div className="empty-line">Crossref is unavailable at the moment. No sample papers are substituted.</div>}
          {!papers.isLoading && !papers.error && !papers.data?.sources.length && <div className="empty-line">No records returned for this query.</div>}
        </div>
        <p className="source-footnote">Titles and dates are returned by Crossref; a DOI link opens the source record. Metadata does not establish a study’s conclusions.</p>
      </section>

      <section className="closing-banner"><span className="closing-small">DISCOVERY ENGINE · POWERED BY NOVA AI</span><h2>Every question opens<br />a new <em>universe.</em></h2><Link href="/nova" className="button-primary">Begin with a question <ArrowUpRight size={15} /></Link><span className="closing-star">✳</span></section>
    </div>
  );
}
