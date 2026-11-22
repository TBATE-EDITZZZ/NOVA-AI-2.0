import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { ArrowDownRight, ArrowUpRight, Search, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [, setLocation] = useLocation();
  const [question, setQuestion] = useState("");
  const quakes = trpc.science.earthquakes.useQuery(undefined, { staleTime: 60_000, refetchInterval: 60_000 });

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

      <section className="section-block nova-feature">
        <div className="nova-orbit-art" aria-hidden="true"><div className="nova-orbit-ring ring-a" /><div className="nova-orbit-ring ring-b" /><div className="nova-core">N</div><div className="nova-star star-a" /><div className="nova-star star-b" /></div>
        <div className="nova-feature-copy"><div className="section-kicker"><span>03</span> YOUR RESEARCH COMPANION</div><h2>Meet <span>NOVA.</span><br />Question further.</h2><p>From a quick explanation to a source-backed research brief, NOVA makes its mode, evidence and limits visible. Citations appear only when a real source lookup returns them.</p><div className="nova-mode-list"><span>QUICK ANSWER</span><span>DEEP RESEARCH</span><span>EXPLAIN SIMPLY</span><span>COMPARE EVIDENCE</span></div><Link href="/nova" className="button-primary">Open NOVA <ArrowUpRight size={15} /></Link></div>
        <div className="nova-feature-index">NEURAL OBSERVATION<br />&amp; VERIFICATION ASSISTANT</div>
      </section>

      <section className="closing-banner"><span className="closing-small">DISCOVERY ENGINE · POWERED BY NOVA AI</span><h2>Every question opens<br />a new <em>universe.</em></h2><Link href="/nova" className="button-primary">Begin with a question <ArrowUpRight size={15} /></Link><span className="closing-star">✳</span></section>
    </div>
  );
}
