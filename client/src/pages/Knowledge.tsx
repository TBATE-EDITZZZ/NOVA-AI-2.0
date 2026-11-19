import { useState } from "react";
import { ArrowRight, Orbit } from "lucide-react";

type Concept = { id: string; label: string; x: number; y: number; explanation: string };
const concepts: Concept[] = [
  { id: "atom", label: "ATOM", x: 72, y: 102, explanation: "An atom is a unit of chemical element with a nucleus and electrons. Its identity is set by proton number." },
  { id: "element", label: "ELEMENT", x: 244, y: 102, explanation: "An element is a substance defined by atoms with the same number of protons. Elements can bond into compounds." },
  { id: "molecule", label: "MOLECULE", x: 416, y: 102, explanation: "A molecule is a group of atoms connected by chemical bonds. Molecular structure affects its behavior." },
  { id: "cell", label: "CELL", x: 588, y: 102, explanation: "Cells use molecules to build structures and carry out life processes; cell composition differs across organisms." },
  { id: "organism", label: "ORGANISM", x: 760, y: 102, explanation: "An organism is an individual living system, from a single-celled microbe to a multicellular animal or plant." },
  { id: "ecosystem", label: "ECOSYSTEM", x: 932, y: 102, explanation: "An ecosystem includes organisms in a place and their interactions with the physical environment." },
  { id: "sun", label: "SUN", x: 152, y: 255, explanation: "The Sun is a star whose gravity dominates the solar system; nuclear fusion in its core powers its light." },
  { id: "solar", label: "SOLAR SYSTEM", x: 360, y: 255, explanation: "The solar system includes the Sun and the bodies bound to it by gravity, including planets, moons, comets and smaller objects." },
  { id: "galaxy", label: "GALAXY", x: 568, y: 255, explanation: "The Milky Way is a barred spiral galaxy containing the Sun and many other stars, gas and dust." },
  { id: "universe", label: "UNIVERSE", x: 776, y: 255, explanation: "The observable universe is the region from which light has had time to reach us; it is not necessarily the whole universe." },
];
const connections = [["atom", "element"], ["element", "molecule"], ["molecule", "cell"], ["cell", "organism"], ["organism", "ecosystem"], ["sun", "solar"], ["solar", "galaxy"], ["galaxy", "universe"], ["molecule", "organism"], ["ecosystem", "universe"]];

export default function Knowledge() {
  const [selectedId, setSelectedId] = useState("atom");
  const selected = concepts.find(concept => concept.id === selectedId)!;
  const map = new Map(concepts.map(concept => [concept.id, concept]));
  return (
    <div className="page-container knowledge-page">
      <div className="page-heading"><div><div className="section-kicker"><span>06</span> SCIENTIFIC KNOWLEDGE GRAPH</div><h1>See what<br /><span>connects.</span></h1></div><p>Choose a concept to inspect its short description and its linked neighbors. These are introductory relationships, not a complete scientific ontology.</p></div>
      <section className="knowledge-canvas"><div className="knowledge-topline"><span className="card-kicker"><Orbit size={14} /> CONCEPT MAP · SELECT A NODE</span><span>DRAG NOT REQUIRED · KEYBOARD ACCESSIBLE</span></div><div className="graph-scroll"><svg className="knowledge-graph" viewBox="0 0 1000 340" role="group" aria-label="Interactive concept map linking atom to ecosystem and Sun to universe">
          {connections.map(([from, to]) => { const a = map.get(from)!; const b = map.get(to)!; const active = selectedId === from || selectedId === to; return <g key={`${from}-${to}`}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={active ? "graph-edge active" : "graph-edge"} /><circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r="2.2" className={active ? "graph-edge-dot active" : "graph-edge-dot"} /></g>; })}
          {concepts.map(concept => <g key={concept.id} className={`graph-node${selectedId === concept.id ? " selected" : ""}`} role="button" tabIndex={0} aria-label={`Select ${concept.label}`} aria-pressed={selectedId === concept.id} onClick={() => setSelectedId(concept.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(concept.id); } }}><circle cx={concept.x} cy={concept.y} r={selectedId === concept.id ? 16 : 11} /><text x={concept.x} y={concept.y + 34} textAnchor="middle">{concept.label}</text></g>)}
        </svg></div><div className="graph-legend"><span><i className="legend-dot" /> MATTER → LIFE → ECOLOGY</span><span><i className="legend-dot violet" /> SUN → SOLAR SYSTEM → GALAXY → UNIVERSE</span></div></section>
      <section className="concept-panel"><div className="concept-number">CONCEPT / {String(concepts.findIndex(item => item.id === selected.id) + 1).padStart(2, "0")}</div><div><span className="card-kicker">SELECTED NODE</span><h2>{selected.label}</h2><p>{selected.explanation}</p></div><div className="connected-list"><span>CONNECTED TO</span>{connections.flatMap(([from, to]) => from === selected.id ? [map.get(to)!] : to === selected.id ? [map.get(from)!] : []).map(concept => <button key={concept.id} onClick={() => setSelectedId(concept.id)}>{concept.label}<ArrowRight size={13} /></button>)}</div></section>
      <p className="model-disclaimer">Connections describe broad conceptual relationships for exploration. They do not imply that each larger system is built only from the preceding concept.</p>
    </div>
  );
}
