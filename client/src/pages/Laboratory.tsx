import { useMemo, useState } from "react";
import { ArrowUpRight, Gauge, Info, LoaderCircle, RotateCcw, Sparkles, WandSparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";

export default function Laboratory() {
  const [speed, setSpeed] = useState(22);
  const [angle, setAngle] = useState(48);
  const [gravity, setGravity] = useState(9.81);
  const [designQuestion, setDesignQuestion] = useState("");
  const [design, setDesign] = useState("");
  const [designError, setDesignError] = useState("");
  const designMutation = trpc.nova.ask.useMutation();
  const results = useMemo(() => {
    const radians = angle * Math.PI / 180;
    const flight = 2 * speed * Math.sin(radians) / gravity;
    const range = (speed * speed * Math.sin(2 * radians)) / gravity;
    const height = (speed * speed * Math.sin(radians) ** 2) / (2 * gravity);
    const maxRange = Math.max(range, 0.01);
    const scaleX = 640 / maxRange;
    const scaleY = 270 / Math.max(height, 0.01);
    const points = Array.from({ length: 65 }, (_, index) => {
      const time = flight * index / 64;
      const x = speed * Math.cos(radians) * time;
      const y = Math.max(0, speed * Math.sin(radians) * time - gravity * time * time / 2);
      return `${40 + x * scaleX},${300 - y * scaleY}`;
    }).join(" ");
    return { flight, range, height, points };
  }, [speed, angle, gravity]);

  function reset() { setSpeed(22); setAngle(48); setGravity(9.81); }
  async function draftExperiment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = designQuestion.trim();
    if (question.length < 8) { setDesignError("Describe an experiment question in at least eight characters."); return; }
    setDesignError(""); setDesign("");
    try {
      const result = await designMutation.mutateAsync({
        mode: "expert",
        history: [],
        question: `Draft a safe educational experiment plan for this research question: ${question}\n\nReturn clearly labeled sections for objective, hypothesis, independent/dependent/controlled variables, accessible materials, numbered procedure, a blank observation table, expected outcomes explicitly labeled as predictions, safety precautions, limitations, and a conclusion template. This is a plan only: never invent measurements, say an experiment was conducted, or state predictions as findings. Avoid hazardous chemicals, unsafe heat/electricity, human/animal testing, medical diagnosis, or unsupervised fieldwork. If this question cannot be explored safely with a basic classroom or at-home model, say so and suggest a safer alternative. Mark that this AI draft requires review by a responsible instructor before use.`,
      });
      setDesign(result.answer);
    } catch (error) {
      setDesignError(error instanceof Error ? error.message : "NOVA could not draft an experiment plan right now.");
    }
  }

  return (
    <div className="page-container lab-page">
      <div className="page-heading"><div><div className="section-kicker"><span>03</span> VIRTUAL SCIENCE LABORATORY</div><h1>Make a model.<br /><span>Test a variable.</span></h1></div><p>Adjust the starting conditions and observe the mathematical result. This ideal model omits air resistance and is not a real-world measurement.</p></div>
      <div className="lab-tabs"><span className="lab-tab selected"><Gauge size={14} /> Physics · Projectile motion</span><span className="lab-tab disabled">Chemistry · Planned</span><span className="lab-tab disabled">Biology · Planned</span></div>
      <section className="experiment-panel"><div className="experiment-header"><div><span className="card-kicker">SIMULATION 01 · 2D KINEMATICS</span><h2>Projectile motion</h2></div><button className="small-icon-action" onClick={reset}><RotateCcw size={14} /> Reset</button></div><div className="experiment-layout"><div className="experiment-controls"><div className="control-intro"><span className="control-index">01</span><div><strong>Set conditions</strong><p>Change an independent variable and compare the predicted trajectory.</p></div></div><label className="range-control"><span>Initial speed <b>{speed} m/s</b></span><input type="range" min="5" max="50" step="1" value={speed} onChange={event => setSpeed(Number(event.target.value))} /><small>Range: 5–50 metres per second</small></label><label className="range-control"><span>Launch angle <b>{angle}°</b></span><input type="range" min="10" max="80" step="1" value={angle} onChange={event => setAngle(Number(event.target.value))} /><small>Measured above a level horizontal surface</small></label><label className="range-control"><span>Gravitational acceleration <b>{gravity.toFixed(2)} m/s²</b></span><input type="range" min="1.62" max="24.79" step="0.01" value={gravity} onChange={event => setGravity(Number(event.target.value))} /><small>About 9.81 m/s² near Earth’s surface</small></label><div className="principle-note"><Info size={15} /><p>Assumes a level surface, constant gravity, and zero air resistance. The result is a model prediction, not an experiment conducted in a lab.</p></div></div>
          <div className="experiment-results"><div className="chart-topline"><span className="card-kicker">PREDICTED TRAJECTORY</span><span className="chart-unit">HEIGHT / DISTANCE · RELATIVE AXES</span></div><div className="projectile-chart"><svg viewBox="0 0 720 340" preserveAspectRatio="none" role="img" aria-label={`Predicted projectile path, range ${results.range.toFixed(1)} meters and maximum height ${results.height.toFixed(1)} meters`}><defs><linearGradient id="projectile-line" x1="0" x2="1"><stop stopColor="#8d71f2" /><stop offset="1" stopColor="#59e2d5" /></linearGradient><linearGradient id="projectile-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#9178f4" stopOpacity=".22" /><stop offset="1" stopColor="#9178f4" stopOpacity="0" /></linearGradient></defs><path d="M40 300 H690 M40 30 V300" stroke="rgba(255,255,255,.12)" strokeWidth="1" /><path d="M40 230 H690 M40 160 H690 M40 90 H690" stroke="rgba(255,255,255,.06)" strokeWidth="1" strokeDasharray="3 7" /><polyline points={results.points} fill="none" stroke="url(#projectile-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="40" cy="300" r="4" fill="#fff" /></svg><span className="axis-y">HEIGHT</span><span className="axis-x">DISTANCE</span></div><div className="result-metrics"><div><span>FLIGHT TIME</span><strong>{results.flight.toFixed(2)}<small> s</small></strong></div><div><span>HORIZONTAL RANGE</span><strong>{results.range.toFixed(1)}<small> m</small></strong></div><div><span>MAXIMUM HEIGHT</span><strong>{results.height.toFixed(1)}<small> m</small></strong></div></div></div></div></section>
      <div className="formula-panel"><div><span className="card-kicker">SCIENTIFIC PRINCIPLE</span><h3>Resolve the motion into components.</h3><p>For initial speed <i>v</i>, launch angle <i>θ</i>, and constant gravity <i>g</i>, the ideal flight time is 2v sin(θ)/g and the horizontal range is v² sin(2θ)/g, when launch and landing heights are equal.</p></div><div className="equation-block"><span>R = v² sin(2θ) / g</span><small>IDEAL LEVEL-GROUND RANGE</small></div></div>
      <section className="experiment-design"><div className="experiment-design-heading"><span className="design-icon"><WandSparkles size={16} /></span><div><span className="card-kicker">EXPERIMENT DESIGN ASSISTANT · GEMINI</span><h2>Turn curiosity into a method.</h2><p>Ask NOVA to draft variables, materials, steps and an observation template. The response is a proposal, not a safety certification or a set of results.</p></div></div><form onSubmit={event => void draftExperiment(event)}><label htmlFor="experiment-question">What would you like to investigate?</label><div className="experiment-design-input"><input id="experiment-question" value={designQuestion} onChange={event => setDesignQuestion(event.target.value)} maxLength={1000} placeholder="For example: How does launch angle affect a model projectile's range?" /><button className="button-primary" type="submit" disabled={designMutation.isPending || !designQuestion.trim()}>{designMutation.isPending ? <LoaderCircle size={14} className="spin" /> : <Sparkles size={14} />}{designMutation.isPending ? "Drafting…" : "Draft with NOVA"}</button></div></form>{designError && <p className="experiment-design-error" role="alert">{designError}</p>}{design && <div className="experiment-design-result"><div className="design-result-label"><span>AI-GENERATED DRAFT · REVIEW BEFORE USE</span><button className="small-icon-action" onClick={() => { setDesign(""); setDesignQuestion(""); }}>Clear</button></div><div className="design-answer"><Streamdown>{design}</Streamdown></div></div>}<p className="experiment-design-note"><Info size={13} /> Do not perform a real activity without an instructor or responsible adult reviewing the steps and materials. No experiment or measurement is claimed to have occurred.</p></section>
      <div className="next-labs"><span className="card-kicker">MORE INVESTIGATIONS</span><p>Interactive circuit, wave, molecular, pH, cell and genetics activities are part of the approved roadmap; they are not active in this first lab build.</p><a className="text-link" href="/nova?question=Help%20me%20design%20a%20safe%20experiment%20about%20projectile%20motion">Ask NOVA to draft a follow-up <ArrowUpRight size={14} /></a></div>
    </div>
  );
}
