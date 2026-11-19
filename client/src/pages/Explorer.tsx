import { useState } from "react";
import { Link } from "wouter";
import { Activity, ArrowRight, ArrowUpRight, Atom, Dna, Globe2, Microscope, Orbit, Zap } from "lucide-react";

const categories = [
  { name: "Physics", icon: Zap, count: "08 DOMAINS", topics: [
    ["Mechanics", "The study of motion, forces and energy. Classical mechanics models many everyday systems; quantum mechanics is needed at much smaller scales."],
    ["Electricity & magnetism", "Electric and magnetic fields are linked parts of electromagnetism. Maxwell’s equations describe their behavior across many scales."],
    ["Light & sound", "Light is electromagnetic radiation. Sound is a mechanical wave that needs a medium such as air, water or a solid."],
    ["Quantum physics", "A framework for describing matter and energy at atomic and subatomic scales, where predictions are usually probabilistic."],
    ["Thermodynamics", "Studies heat, work, temperature and energy transfer, including why many processes have a preferred direction."],
    ["Relativity", "Einstein’s theories describe how space, time, gravity and motion relate, particularly at high speeds or in strong gravitational fields."],
  ] },
  { name: "Chemistry", icon: Atom, count: "06 DOMAINS", topics: [
    ["Periodic table", "An arrangement of chemical elements by atomic number that reveals repeating patterns in their properties."],
    ["Chemical reactions", "Processes that rearrange atoms and bonds. A balanced equation accounts for the atoms on both sides."],
    ["Molecular structures", "The three-dimensional arrangement of atoms can influence molecular properties and reactivity."],
    ["Organic chemistry", "The study of carbon-containing compounds and their structures, reactions and uses."],
    ["Atomic structure", "Atoms contain a nucleus of protons and neutrons surrounded by electrons described by quantum states."],
  ] },
  { name: "Biology", icon: Dna, count: "07 DOMAINS", topics: [
    ["Cells", "Cells are the basic structural units of life. Their components vary among organisms and cell types."],
    ["Genetics", "The study of heredity and variation. DNA stores biological information, while regulation and environment also affect traits."],
    ["Evolution", "Changes in heritable characteristics of populations over generations; natural selection is one mechanism among several."],
    ["Microbiology", "Studies microorganisms such as bacteria, archaea, fungi, protists and viruses."],
    ["Ecology", "Examines relationships among organisms and between organisms and their environments."],
    ["Neuroscience", "A multidisciplinary study of nervous systems, from molecular signaling to behavior and cognition."],
  ] },
  { name: "Astronomy", icon: Orbit, count: "07 DOMAINS", topics: [
    ["Solar system", "The Sun and the objects gravitationally bound to it, including eight planets, dwarf planets, moons, asteroids and comets."],
    ["Stars & galaxies", "Stars form and evolve over time; galaxies are vast systems of stars, gas, dust and dark matter."],
    ["Black holes", "Regions where gravity is so strong that the event horizon marks a boundary beyond which light cannot escape."],
    ["Exoplanets", "Planets orbiting stars beyond the Sun, commonly found through transit or radial-velocity measurements."],
    ["Cosmology", "The study of the universe’s large-scale structure, history and evolution."],
  ] },
  { name: "Environmental science", icon: Globe2, count: "06 DOMAINS", topics: [
    ["Climate change", "Long-term shifts in climate. Human-caused greenhouse-gas emissions are warming the global climate system."],
    ["Biodiversity", "The variety of life across genes, species and ecosystems, shaped by ecological and evolutionary processes."],
    ["Renewable energy", "Energy from replenishing sources such as sunlight, wind, moving water and geothermal heat."],
    ["Ocean science", "Interdisciplinary study of ocean circulation, ecosystems, chemistry, geology and climate interactions."],
    ["Pollution", "Contaminants or energy introduced into the environment at levels that can cause harm."],
  ] },
];

export default function Explorer() {
  const [activeCategory, setActiveCategory] = useState("Physics");
  const [activeTopic, setActiveTopic] = useState<string | null>("Mechanics");
  const [filter, setFilter] = useState("");
  const category = categories.find(item => item.name === activeCategory)!;
  const topics = category.topics.filter(([name]) => name.toLowerCase().includes(filter.toLowerCase()));
  const selected = category.topics.find(([name]) => name === activeTopic);

  return (
    <div className="page-container explorer-page">
      <div className="page-heading"><div><div className="section-kicker"><span>01</span> SCIENCE EXPLORER</div><h1>Follow the<br /><span>question.</span></h1></div><p>Explore connected ideas across the sciences. These concise topic notes are introductions, not substitutes for primary research.</p></div>
      <div className="explorer-toolbar"><span className="card-kicker">CHOOSE A FIELD</span><div className="category-tabs" role="tablist" aria-label="Science categories">{categories.map(({ name, icon: Icon }) => <button key={name} role="tab" aria-selected={activeCategory === name} className={activeCategory === name ? "selected" : ""} onClick={() => { setActiveCategory(name); setActiveTopic(null); }}><Icon size={15} />{name}</button>)}</div></div>
      <div className="explorer-layout"><section className="topic-browser"><div className="browser-head"><div><span className="card-kicker">{category.count}</span><h2>{activeCategory}</h2></div><input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Filter topics" aria-label="Filter topics" /></div><div className="topic-list">{topics.map(([name, description], index) => <button key={name} onClick={() => setActiveTopic(name)} className={`topic-row${activeTopic === name ? " active" : ""}`}><span className="topic-order">0{index + 1}</span><span><strong>{name}</strong><small>{description}</small></span><ArrowUpRight size={15} /></button>)}{!topics.length && <p className="empty-line">No topics match that filter.</p>}</div></section>
        <aside className="topic-detail"><div className="detail-orbit"><Atom size={22} /></div><span className="card-kicker">CONCEPT NOTE</span>{selected ? <><h2>{selected[0]}</h2><p>{selected[1]}</p><div className="detail-related"><span>KEEP EXPLORING</span><Link href="/laboratory">Try an interactive lab <ArrowRight size={13} /></Link><Link href={`/nova?question=${encodeURIComponent(`Explain ${selected[0]} in ${activeCategory}`)}`}>Ask NOVA about this <ArrowRight size={13} /></Link></div></> : <><h2>Select a topic.</h2><p>Choose a concept to see its introduction and connected ways to explore.</p></>}</aside></div>
      <div className="explorer-note"><Microscope size={17} /><p>For a source-backed answer, open NOVA in Deep Research mode. Topic notes on this page are introductory summaries and do not include a literature search.</p></div>
    </div>
  );
}
