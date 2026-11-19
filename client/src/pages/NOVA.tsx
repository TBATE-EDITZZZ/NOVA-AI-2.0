import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ArrowUpRight, BookOpen, BookmarkPlus, Check, Clipboard, Download, FileText, ImagePlus, LoaderCircle, Mic, RotateCcw, Send, Sparkles, Volume2, X } from "lucide-react";
import { Streamdown } from "streamdown";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type Source = { title: string; url: string; publisher: string | null; publishedAt: string | null; authors: string[] };
type Attachment = { mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "application/pdf"; data: string; name: string };
type Message = { id: string; role: "user" | "assistant"; text: string; sources?: Source[]; researchStatus?: string; attachmentName?: string; mode?: Mode; error?: boolean };
type Mode = "quick" | "deep" | "eli10" | "expert" | "step" | "compare" | "discovery";
type VoiceRecognition = { lang: string; interimResults: boolean; maxAlternatives: number; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type VoiceWindow = Window & { SpeechRecognition?: new () => VoiceRecognition; webkitSpeechRecognition?: new () => VoiceRecognition };

const modes: { id: Mode; name: string; note: string }[] = [
  { id: "quick", name: "Quick answer", note: "A concise scientific explanation; sources are not searched." },
  { id: "deep", name: "Deep research", note: "Searches Crossref metadata before drafting; records appear only if returned." },
  { id: "eli10", name: "Explain like I’m 10", note: "Plain language without losing the scientific idea." },
  { id: "expert", name: "Scientific expert", note: "Precise terminology, assumptions, mechanisms and limitations." },
  { id: "step", name: "Step-by-step learning", note: "Builds the concept one learning step at a time." },
  { id: "compare", name: "Compare & analyse", note: "Requests source metadata and compares what it can support." },
  { id: "discovery", name: "Discovery mode", note: "Explores what is known, what is uncertain and what to observe next." },
];
const prompts = ["Why does the Moon always show us the same face?", "How do scientists detect an exoplanet?", "What happens inside a cell during mitosis?"];
const historyKey = "discovery-engine-nova-session";

function readHistory(): Message[] {
  try {
    const saved = sessionStorage.getItem(historyKey);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (Array.isArray(parsed)) return parsed.slice(-30) as Message[];
  } catch { /* Private browsing can disable sessionStorage. */ }
  return [];
}

export default function NOVA() {
  const [messages, setMessages] = useState<Message[]>(readHistory);
  const [mode, setMode] = useState<Mode>("quick");
  const [input, setInput] = useState(() => new URLSearchParams(window.location.search).get("question") ?? "");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [formError, setFormError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});
  const [voiceLanguage, setVoiceLanguage] = useState("en-US");
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const mutation = trpc.nova.ask.useMutation();
  const saveMutation = trpc.workspace.save.useMutation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const recognitionRef = useRef<VoiceRecognition | null>(null);

  useEffect(() => {
    try { sessionStorage.setItem(historyKey, JSON.stringify(messages.slice(-30))); } catch { /* Session persistence is optional. */ }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => () => { recognitionRef.current?.stop(); if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);

  async function encodeFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const supported = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
    if (!supported.includes(file.type)) {
      setFormError("Choose a PNG, JPEG, WebP, GIF, or PDF file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setFormError("This first-pass upload supports files up to 4 MB.");
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    setAttachment({ mimeType: file.type as Attachment["mimeType"], data: btoa(binary), name: file.name.slice(0, 120) });
    setFormError("");
  }

  async function ask(text: string, keepUserMessage = false) {
    const question = text.trim();
    if (!question || mutation.isPending) return;
    setFormError("");
    const currentAttachment = attachment;
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text: question, attachmentName: currentAttachment?.name };
    const priorUserIndex = keepUserMessage ? messages.map(message => message.role).lastIndexOf("user") : -1;
    const prior = keepUserMessage && priorUserIndex >= 0 ? messages.slice(0, priorUserIndex) : messages;
    const nextMessages = keepUserMessage && priorUserIndex >= 0 ? messages.slice(0, priorUserIndex + 1) : [...messages, userMessage];
    const requestMode = mode;
    setMessages(nextMessages);
    setInput("");
    setAttachment(null);
    try {
      const result = await mutation.mutateAsync({
        question,
        mode: requestMode,
        history: prior.slice(-12).map(message => ({ role: message.role, text: message.text })),
        ...(currentAttachment ? { attachment: currentAttachment } : {}),
      });
      setMessages([...nextMessages, { id: crypto.randomUUID(), role: "assistant", text: result.answer, sources: result.sources, researchStatus: result.researchStatus, mode: requestMode }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "NOVA could not complete that request.";
      setFormError(message);
      setMessages([...nextMessages, { id: crypto.randomUUID(), role: "assistant", text: message, error: true }]);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }

  async function saveMessage(message: Message, index: number) {
    const precedingQuestion = messages.slice(0, index).reverse().find(item => item.role === "user");
    if (!precedingQuestion) return;
    if (!user) { startLogin(); return; }
    setSaveStatus(previous => ({ ...previous, [message.id]: "Saving…" }));
    try {
      await saveMutation.mutateAsync({
        title: precedingQuestion.text.slice(0, 240),
        question: precedingQuestion.text,
        answer: message.text,
        mode: message.mode ?? mode,
        sources: message.sources ?? [],
      });
      setSaveStatus(previous => ({ ...previous, [message.id]: "Saved to your library" }));
      await utils.workspace.list.invalidate();
    } catch (error) {
      setSaveStatus(previous => ({ ...previous, [message.id]: error instanceof Error ? error.message : "Could not save this answer." }));
    }
  }

  async function copyText(message: Message) {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(""), 1600);
    } catch {
      setFormError("Clipboard access was not available in this browser.");
    }
  }

  function toggleVoiceInput() {
    if (listening) { recognitionRef.current?.stop(); return; }
    const speechWindow = window as VoiceWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) { setFormError("Voice input is not supported in this browser. You can still type your question."); return; }
    try {
      const recognition = new Recognition();
      recognition.lang = voiceLanguage;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = event => {
        const transcript = event.results[0]?.[0]?.transcript?.trim();
        if (transcript) { setInput(value => value ? `${value} ${transcript}` : transcript); setFormError(""); }
      };
      recognition.onerror = event => setFormError(`Voice input stopped (${event.error}). You can continue by typing.`);
      recognition.onend = () => { setListening(false); recognitionRef.current = null; };
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
      setFormError("Voice input could not start. Check microphone permission or continue by typing.");
    }
  }

  function speakAnswer(message: Message) {
    if (!("speechSynthesis" in window)) { setFormError("Read-aloud is not supported in this browser."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.text);
    utterance.lang = voiceLanguage;
    window.speechSynthesis.speak(utterance);
  }

  function exportReport() {
    const report = messages.map(message => message.role === "assistant"
      ? `## NOVA\n\n${message.text}${message.sources?.length ? `\n\n### Sources\n${message.sources.map((source, i) => `${i + 1}. [${source.title}](${source.url})${source.publishedAt ? ` — ${source.publishedAt}` : ""}`).join("\n")}` : ""}`
      : `## Question\n\n${message.text}${message.attachmentName ? `\n\nAttachment: ${message.attachmentName}` : ""}`).join("\n\n---\n\n");
    const blob = new Blob([`# NOVA research notes\n\nExported ${new Date().toISOString()}\n\n${report}\n`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "nova-research-notes.md"; a.click(); URL.revokeObjectURL(url);
  }

  const lastUserIndex = messages.map(message => message.role).lastIndexOf("user");
  const activeMode = modes.find(item => item.id === mode)!;

  return (
    <div className="workspace-page nova-page">
      <aside className="workspace-rail">
        <div className="rail-topline"><span className="rail-orbit">✳</span><span>NOVA WORKSPACE</span></div>
        <button className="new-research-button" onClick={() => { setMessages([]); setFormError(""); setAttachment(null); sessionStorage.removeItem(historyKey); }}><span>＋</span> New research</button>
        <div className="rail-caption">RESEARCH MODES</div>
        <div className="mode-list">
          {modes.map(item => <button key={item.id} className={`mode-option${mode === item.id ? " selected" : ""}`} onClick={() => setMode(item.id)}><span className="mode-mark" />{item.name}</button>)}
        </div>
        <div className="mode-description">{activeMode.note}</div>
        <div className="rail-bottom"><span className="status-dot" /> GEMINI API · SERVER SIDE<br /><span className="rail-subtle">Source verification runs only in research modes.</span></div>
      </aside>

      <section className="nova-conversation">
        <div className="workspace-heading"><div><div className="section-kicker"><span>01</span> NEURAL OBSERVATION &amp; VERIFICATION ASSISTANT</div><h1>Ask <span>NOVA.</span></h1></div><div className="workspace-actions"><button className="small-icon-action" onClick={exportReport} disabled={!messages.length} title="Export report"><Download size={15} /> <span>Export</span></button><button className="small-icon-action" onClick={() => { setMessages([]); setFormError(""); sessionStorage.removeItem(historyKey); }} disabled={!messages.length} title="Clear current session"><RotateCcw size={14} /> <span>Reset</span></button></div></div>

        <div className={`conversation-scroll${messages.length ? " has-messages" : ""}`}>
          {!messages.length ? <div className="nova-empty-state">
            <div className="nova-empty-symbol"><div /><span>N</span></div>
            <span className="card-kicker">A QUESTION IS A PLACE TO BEGIN</span>
            <h2>What are you<br />wondering about?</h2>
            <p>Choose a mode, ask a question, and follow the evidence. Quick answers are not source-verified; Deep Research searches Crossref and displays the records it actually returns.</p>
            <div className="prompt-suggestions">{prompts.map(prompt => <button key={prompt} onClick={() => setInput(prompt)}>{prompt}<ArrowUpRight size={13} /></button>)}</div>
          </div> : <div className="message-list">
            {messages.map((message, index) => <article key={message.id} className={`chat-message ${message.role}${message.error ? " message-error" : ""}`}>
              <div className="message-avatar">{message.role === "assistant" ? <span>✳</span> : <span>Y</span>}</div>
              <div className="message-main"><div className="message-meta">{message.role === "assistant" ? "NOVA" : "YOUR QUESTION"}{message.role === "assistant" && message.researchStatus && <span className={`verification-pill ${message.researchStatus}`}>{message.researchStatus === "sources_found" ? "CROSSREF RECORDS FOUND" : message.researchStatus === "no_sources" ? "NO RECORDS RETURNED" : message.researchStatus === "lookup_unavailable" ? "SOURCE LOOKUP UNAVAILABLE" : "EXPLANATION · NOT SOURCE-VERIFIED"}</span>}</div>
                {message.role === "assistant" ? <div className="message-text"><Streamdown>{message.text}</Streamdown></div> : <p className="user-message-text">{message.text}{message.attachmentName && <span className="attached-file"><FileText size={14} /> {message.attachmentName}</span>}</p>}
                {message.sources?.length ? <div className="citation-stack"><div className="citation-heading"><BookOpen size={13} /> SOURCE METADATA RETURNED BY CROSSREF</div>{message.sources.map((source, sourceIndex) => <a key={source.url} className="citation-card" href={source.url} target="_blank" rel="noreferrer"><span className="citation-number">{sourceIndex + 1}</span><span><strong>{source.title}</strong><small>{source.authors.slice(0, 2).join(", ") || "Authors not listed"}{source.publisher ? ` · ${source.publisher}` : ""}{source.publishedAt ? ` · ${source.publishedAt}` : ""}</small></span><ArrowUpRight size={14} /></a>)}<p className="source-disclaimer">These are bibliographic records returned by Crossref. Metadata alone does not verify the results or conclusions in a paper.</p></div> : null}
                {message.role === "assistant" && <div className="message-tools">
                  <button onClick={() => void copyText(message)}>{copiedId === message.id ? <Check size={13} /> : <Clipboard size={13} />}{copiedId === message.id ? "Copied" : "Copy"}</button>
                  {index === messages.length - 1 && message.error && <button onClick={() => { const lastUser = [...messages].reverse().find(item => item.role === "user"); if (lastUser) void ask(lastUser.text, true); }}><RotateCcw size={13} /> Retry</button>}
                  {index === messages.length - 1 && !message.error && <button onClick={() => { const lastUser = [...messages].reverse().find(item => item.role === "user"); if (lastUser) void ask(lastUser.text, true); }}><RotateCcw size={13} /> Regenerate</button>}
                  {!message.error && <button onClick={() => speakAnswer(message)}><Volume2 size={13} /> Read aloud</button>}
                  {!message.error && <button onClick={() => user ? void saveMessage(message, index) : startLogin()} disabled={saveMutation.isPending}><BookmarkPlus size={13} />{saveStatus[message.id] || (user ? "Save" : "Sign in to save")}</button>}
                </div>}
              </div>
            </article>)}
            {mutation.isPending && <div className="thinking-state"><span className="thinking-mark"><LoaderCircle size={16} className="spin" /></span><span>{mode === "deep" || mode === "compare" || mode === "discovery" ? "NOVA is requesting research records and drafting an answer…" : "NOVA is preparing an answer…"}</span><small>Waiting for the server response; no research step is claimed complete yet.</small></div>}
            <div ref={endRef} />
          </div>}
        </div>

        <div className="composer-wrap">
          {formError && <div className="composer-error" role="alert">{formError}</div>}
          {attachment && <div className="attachment-chip"><FileText size={14} />{attachment.name}<span>{(attachment.data.length * 0.75 / 1024 / 1024).toFixed(1)} MB</span><button onClick={() => setAttachment(null)} aria-label="Remove attachment"><X size={14} /></button></div>}
          <form className="nova-composer" onSubmit={submit}>
            <textarea rows={2} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!mutation.isPending) void ask(input); } }} placeholder="Ask a scientific question…" aria-label="Your question for NOVA" />
            <div className="composer-bottom"><div className="composer-left"><label className="upload-button" title="Attach image or PDF"><ImagePlus size={16} /><span>Attach</span><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" onChange={event => void encodeFile(event)} /></label><button type="button" className={`voice-button${listening ? " listening" : ""}`} onClick={toggleVoiceInput} aria-label={listening ? "Stop voice input" : "Start voice input"} title={listening ? "Stop listening" : "Speak your question"}><Mic size={14} /><span>{listening ? "Listening…" : "Speak"}</span></button><select className="voice-language" aria-label="Voice language" value={voiceLanguage} onChange={event => setVoiceLanguage(event.target.value)}><option value="en-US">EN</option><option value="hi-IN">HI</option><option value="ml-IN">ML</option></select><span className="composer-separator" /><span className="composer-hint">Enter to send · Shift + Enter for a new line</span></div><button type="submit" className="send-button" disabled={!input.trim() || mutation.isPending} aria-label="Send to NOVA">{mutation.isPending ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}<span>Send</span></button></div>
          </form>
          <div className="privacy-note"><Sparkles size={12} /> Attachments are sent to Gemini only when submitted. Current upload limit: 4 MB. This app does not retain the file.</div>
        </div>
      </section>
    </div>
  );
}
