import "./ImageStudio.css";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Clock3, Search, Trash2, X, Image as ImageIcon,
  CalendarDays, Maximize2
} from "lucide-react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

type HistoryItem = {
  id: string;
  prompt: string;
  style: string;
  ratio: string;
  provider: string;
  mode: string;
  thumb: string;
  createdAt: number;
};

const KEY = "nova.studio.history";

function readHistory(): HistoryItem[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(data)
      ? data.filter((item) => item && typeof item.prompt === "string")
      : [];
  } catch {
    return [];
  }
}

function dateGroup(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date >= today) return "Today";
  if (date >= yesterday && date < today) return "Yesterday";
  return "Earlier";
}

function HistoryContent() {
  const [, navigate] = useLocation();
  const [items, setItems] = useState<HistoryItem[]>(readHistory);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  useEffect(() => {
    const refresh = () => setItems(readHistory());
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  const filtered = useMemo(
    () => items.filter((item) =>
      `${item.prompt} ${item.style} ${item.provider} ${item.mode}`
        .toLowerCase().includes(query.toLowerCase())
    ),
    [items, query]
  );

  const groups = ["Today", "Yesterday", "Earlier"].map((name) => ({
    name,
    entries: filtered.filter((item) => dateGroup(item.createdAt) === name),
  })).filter((group) => group.entries.length > 0);

  const persist = (next: HistoryItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Keep the current screen usable if storage is unavailable.
    }
  };

  const removeItem = (id: string) => {
    persist(items.filter((item) => item.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const clearAll = () => {
    if (!window.confirm("Clear all saved generations? This cannot be undone.")) return;
    persist([]);
    setSelected(null);
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString(undefined, {
      day: "numeric", month: "short", year: "numeric",
    });

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString(undefined, {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });

  return (
    <main className="studio-history">
      <header className="history-topbar">
        <button className="history-back" onClick={() => navigate("/image-studio")}>
          <ArrowLeft size={18} /> <span>Image Studio</span>
        </button>
        <span className="history-brand">NOVA AI 2.0</span>
      </header>

      <section className="history-content">
        <div className="history-heading">
          <div className="history-heading-icon"><Clock3 size={23} /></div>
          <div>
            <span className="history-eyebrow">YOUR CREATIVE ARCHIVE</span>
            <h1>Generation History</h1>
            <p>Every generated idea, saved in one place.</p>
          </div>
        </div>

        <div className="history-toolbar">
          <label className="history-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search prompts, styles or providers..."
            />
            {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}
          </label>
          <span className="history-count">{filtered.length} / {items.length} generations</span>
          <button className="history-clear" onClick={clearAll} disabled={!items.length}>
            <Trash2 size={15} /> Clear all
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="history-empty-screen">
            <div className="history-empty-icon"><ImageIcon size={30} /></div>
            <h2>{items.length ? "No matching generations" : "Your archive starts here"}</h2>
            <p>{items.length ? "Try another search term." : "Images you generate in NOVA Image Studio will appear here with their dates and times."}</p>
            {!items.length && <button onClick={() => navigate("/image-studio")}>Create an image <ArrowLeft size={15} /></button>}
          </div>
        ) : (
          <div className="history-groups">
            {groups.map((group) => (
              <section className="history-group" key={group.name}>
                <div className="history-group-title">
                  <CalendarDays size={16} />
                  <h2>{group.name}</h2>
                  <span>{group.entries.length}</span>
                </div>
                <div className="history-gallery">
                  {group.entries.map((item) => (
                    <article className="history-tile" key={item.id}>
                      <button className="history-tile-image" onClick={() => setSelected(item)}>
                        {item.thumb
                          ? <img src={item.thumb} alt={item.prompt} />
                          : <span className="history-no-image"><ImageIcon size={28} /></span>}
                        <span className="history-view-icon"><Maximize2 size={16} /></span>
                      </button>
                      <div className="history-tile-info">
                        <p className="history-tile-prompt">{item.prompt}</p>
                        <div className="history-tile-meta">
                          <span>{item.style}</span><span>{item.ratio}</span><span>{item.provider}</span>
                        </div>
                        <div className="history-tile-date">
                          <Clock3 size={13} />
                          <span>{formatDate(item.createdAt)} · {formatTime(item.createdAt)}</span>
                          <button onClick={() => removeItem(item.id)} aria-label="Delete generation"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="history-modal" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
          <div className="history-modal-panel" onClick={(event) => event.stopPropagation()}>
            <button className="history-modal-close" onClick={() => setSelected(null)}><X size={19} /></button>
            {selected.thumb && <img className="history-modal-image" src={selected.thumb} alt={selected.prompt} />}
            <div className="history-modal-info">
              <span className="history-eyebrow">GENERATION DETAILS</span>
              <h2>{selected.prompt}</h2>
              <p>{selected.style} · {selected.ratio} · {selected.provider}</p>
              <p>{selected.mode}</p>
              <p><Clock3 size={14} /> {formatDate(selected.createdAt)} · {formatTime(selected.createdAt)}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ImageStudioHistory() {
  const { user, loading } = useAuth();

  if (loading) return <div className="history-auth-loading">Loading NOVA History…</div>;

  if (!user) {
    return (
      <div className="history-auth-loading">
        <h2>NOVA Generation History</h2>
        <p>Sign in to access your saved generations.</p>
        <button onClick={() => startLogin()}>Sign in to continue</button>
      </div>
    );
  }

  return <HistoryContent />;
}
