import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronLeft, ChevronRight, CircleHelp, RotateCcw, Sparkles } from "lucide-react";

const levels = ["Beginner", "Intermediate", "Advanced"] as const;
type Level = typeof levels[number];
const lessons = [
  { id: "light", field: "PHYSICS · 4 MIN", title: "Light, wavelength and color", level: "Beginner", body: "Visible light is a small part of the electromagnetic spectrum. Different wavelengths are perceived as different colors, and an object’s appearance depends on the light it reflects or emits." },
  { id: "orbit", field: "ASTRONOMY · 5 MIN", title: "Why planets stay in orbit", level: "Beginner", body: "A planet’s forward motion and the Sun’s gravitational pull combine to produce an orbit. It is not held up by a force pushing outward; its path is continuously changing direction." },
  { id: "cells", field: "BIOLOGY · 6 MIN", title: "A cell is a working system", level: "Intermediate", body: "Cells use membranes to regulate exchange with their surroundings. Organelles, molecular machinery and signaling pathways contribute to functions that differ among cell types." },
  { id: "climate", field: "EARTH SCIENCE · 7 MIN", title: "How greenhouse gases warm the climate", level: "Intermediate", body: "Greenhouse gases absorb and re-emit infrared radiation. Human activities have increased atmospheric carbon dioxide and other greenhouse gases, altering Earth’s energy balance." },
  { id: "statistics", field: "METHODS · 8 MIN", title: "Correlation, causation and study design", level: "Advanced", body: "A correlation describes a statistical association. Establishing causality requires additional reasoning about mechanisms, confounding, temporal order, study design and competing explanations." },
  { id: "uncertainty", field: "SCIENTIFIC METHOD · 6 MIN", title: "What a scientific model can—and cannot—tell you", level: "Advanced", body: "A model represents selected features of a system for a defined purpose. Its usefulness depends on assumptions, evidence, scale and uncertainty; a model is not a direct observation of every part of reality." },
];
const quiz = [
  { question: "What does a light-year measure?", choices: ["The time light takes to circle Earth", "A distance", "The brightness of a star"], answer: 1, explanation: "A light-year is a unit of distance: the distance light travels in one year in a vacuum." },
  { question: "Which statement best describes an exoplanet?", choices: ["A planet orbiting a star other than the Sun", "A moon outside the Milky Way", "A planet without an atmosphere"], answer: 0, explanation: "An exoplanet is a planet outside our solar system, orbiting another star or stellar remnant." },
  { question: "Which conclusion follows from a correlation alone?", choices: ["One variable caused the other", "The variables are associated in the observed data", "The result will hold in every population"], answer: 1, explanation: "Correlation identifies an observed association. It does not by itself demonstrate cause, rule out confounding, or guarantee generalization." },
];
const flashcards = [
  { front: "What is a hypothesis?", back: "A clear, testable proposed explanation or prediction that can be examined against evidence." },
  { front: "Does every scientific model represent every detail?", back: "No. Models simplify and focus on features relevant to a purpose. Their assumptions and range of validity matter." },
  { front: "What is the difference between weather and climate?", back: "Weather describes conditions over shorter periods; climate summarizes patterns and variation over longer periods." },
];
function readCompleted(): string[] {
  try {
    const raw = localStorage.getItem("discovery-learning-progress");
    if (raw) { const parsed: unknown = JSON.parse(raw); if (Array.isArray(parsed) && parsed.every(item => typeof item === "string")) return parsed; }
  } catch { /* Storage may be unavailable. */ }
  return [];
}

export default function Learning() {
  const [level, setLevel] = useState<Level>("Beginner");
  const [completed, setCompleted] = useState<string[]>(readCompleted);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [flashIndex, setFlashIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => { try { localStorage.setItem("discovery-learning-progress", JSON.stringify(completed)); } catch { /* Local progress is optional. */ } }, [completed]);
  const visibleLessons = lessons.filter(lesson => lesson.level === level);
  const currentQuestion = quiz[quizIndex];
  const today = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date());

  function markComplete(id: string) {
    setCompleted(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
  }
  function answer(index: number) {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    if (index === currentQuestion.answer) setScore(value => value + 1);
  }
  function advanceQuiz() {
    if (quizIndex + 1 >= quiz.length) setQuizDone(true);
    else { setQuizIndex(value => value + 1); setSelectedAnswer(null); }
  }
  function resetQuiz() { setQuizIndex(0); setSelectedAnswer(null); setScore(0); setQuizDone(false); }
  function nextCard(direction: number) { setFlashIndex(index => (index + direction + flashcards.length) % flashcards.length); setShowAnswer(false); }

  return (
    <div className="page-container learning-page">
      <div className="page-heading"><div><div className="section-kicker"><span>07</span> SCIENCE LEARNING CENTER</div><h1>Learn at the<br /><span>edge of curiosity.</span></h1></div><p>Short concept lessons, active recall and knowledge checks. Learning progress is saved on this device only; it is not synchronized with a signed-in account yet.</p></div>
      <section className="learning-progress"><div><span className="card-kicker">YOUR LOCAL LEARNING RECORD</span><strong>{completed.length}<small> / {lessons.length}</small></strong><span>lessons marked complete</span></div><div className="progress-track"><span style={{ width: `${Math.min(100, completed.length / lessons.length * 100)}%` }} /></div><span className="progress-foot">Stored in this browser · clear site data to reset</span></section>
      <section className="learning-paths"><div className="section-kicker"><span>01</span> CHOOSE A LEVEL</div><div className="level-switcher" role="tablist" aria-label="Learning level">{levels.map(item => <button key={item} role="tab" aria-selected={level === item} className={level === item ? "active" : ""} onClick={() => setLevel(item)}>{item}<span>{lessons.filter(lesson => lesson.level === item).length} lessons</span></button>)}</div></section>
      <section className="learning-lesson-section"><div className="section-heading-row"><div><div className="section-kicker"><span>02</span> CONCEPT NOTES</div><h2>One idea, clearly<br /><span>explained.</span></h2></div><Link className="text-link" href="/explorer">Browse the science map <ArrowRight size={14} /></Link></div><div className="lesson-cards">{visibleLessons.map((lesson, index) => <article className={`lesson-card${completed.includes(lesson.id) ? " completed" : ""}`} key={lesson.id}><span className="lesson-order">0{index + 1}</span><span className="card-kicker">{lesson.field}</span><h3>{lesson.title}</h3><p>{lesson.body}</p><div className="lesson-actions"><button className="lesson-complete" onClick={() => markComplete(lesson.id)}>{completed.includes(lesson.id) ? <><Check size={14} /> Marked complete</> : <>Mark complete <Check size={14} /></>}</button><Link href={`/nova?question=${encodeURIComponent(`Explain ${lesson.title} and what evidence supports it.`)}`} className="lesson-ask">Ask NOVA <ArrowUpRight size={13} /></Link></div></article>)}</div></section>
      <div className="learning-practice-grid">
        <section className="quiz-card"><div className="section-kicker"><span>03</span> DAILY KNOWLEDGE CHECK · {today.toUpperCase()}</div><h2>Test what stuck.</h2>{quizDone ? <div className="quiz-finish"><div className="quiz-score">{score}<small> / {quiz.length}</small></div><p>{score === quiz.length ? "All correct—nice work." : "Review the explanations, then take another run."}</p><button className="button-outline" onClick={resetQuiz}><RotateCcw size={14} /> Try again</button></div> : <><div className="quiz-counter">QUESTION {quizIndex + 1} / {quiz.length}</div><h3>{currentQuestion.question}</h3><div className="quiz-options">{currentQuestion.choices.map((choice, index) => <button key={choice} disabled={selectedAnswer !== null} className={selectedAnswer === index ? (index === currentQuestion.answer ? "correct" : "incorrect") : selectedAnswer !== null && index === currentQuestion.answer ? "correct" : ""} onClick={() => answer(index)}>{choice}{selectedAnswer !== null && index === currentQuestion.answer && <Check size={14} />}</button>)}</div>{selectedAnswer !== null && <div className={`quiz-feedback ${selectedAnswer === currentQuestion.answer ? "good" : "needs-review"}`} role="status">{currentQuestion.explanation}<button onClick={advanceQuiz}>Continue <ArrowRight size={13} /></button></div>}</>}</section>
        <section className="flashcard-card"><div className="section-kicker"><span>04</span> ACTIVE RECALL</div><h2>Turn it over.</h2><button className={`flashcard${showAnswer ? " flipped" : ""}`} onClick={() => setShowAnswer(value => !value)} aria-label={showAnswer ? "Show flashcard question" : "Reveal flashcard answer"}><span className="card-kicker">{showAnswer ? "ANSWER" : "PROMPT"}</span><strong>{showAnswer ? flashcards[flashIndex].back : flashcards[flashIndex].front}</strong><small><RotateCcw size={12} /> {showAnswer ? "Show question" : "Reveal answer"}</small></button><div className="flashcard-controls"><button onClick={() => nextCard(-1)} aria-label="Previous flashcard"><ChevronLeft size={16} /></button><span>{flashIndex + 1} / {flashcards.length}</span><button onClick={() => nextCard(1)} aria-label="Next flashcard"><ChevronRight size={16} /></button></div></section>
      </div>
      <aside className="learning-honesty"><CircleHelp size={16} /><p>Questions and teaching notes here are curated introductions, not a ranking of “trending” questions. For literature and source links, open NOVA in Deep Research mode.</p><Link href="/nova?question=Help%20me%20make%20a%20science%20study%20plan" className="text-link">Ask NOVA for a study plan <ArrowRight size={13} /></Link></aside>
      <div className="learning-daily-stamp"><Sparkles size={13} /> Daily check date uses UTC. It is a built-in knowledge check, not a live news feed.</div>
    </div>
  );
}
