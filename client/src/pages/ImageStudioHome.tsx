import "./ImageStudio.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Crown,
  Download,
  Image as ImageIcon,
  Layers3,
  LayoutGrid,
  Maximize2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Settings2,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  MAX_PROMPT_LENGTH,
  PROVIDER_QUALITY,
  enhancePrompt,
  type GeneratedImage,
  type ModeKey,
  type ProviderKey,
  type RatioKey,
  type StyleKey,
} from "@shared/studio";

type Preset = {
  name: string;
  description: string;
  icon: string;
  accent: string;
  prompt: string;
  ratio: RatioKey;
};

const generationModes: Array<{
  name: ModeKey;
  eyebrow: string;
  description: string;
  meta: string;
  icon: typeof BrainCircuit;
  accent: string;
}> = [
  {
    name: "Smart Mode",
    eyebrow: "ADAPTIVE",
    description: "Balanced results, automatically tuned",
    meta: "1 route · fast",
    icon: BrainCircuit,
    accent: "mode-smart",
  },
  {
    name: "Multi-AI Mode",
    eyebrow: "EXPLORATION",
    description: "Runs every model, then you pick the best",
    meta: "All models · compare",
    icon: Layers3,
    accent: "mode-multi",
  },
  {
    name: "Masterpiece Mode",
    eyebrow: "PRECISION",
    description: "Maximum detail for final artwork",
    meta: "1 route · highest fidelity",
    icon: Crown,
    accent: "mode-masterpiece",
  },
];

const providers: Array<{
  name: ProviderKey;
  short: string;
  description: string;
  quality: string[];
}> = [
  {
    name: "Pollinations",
    short: "P",
    description: "Fast open image pipeline",
    quality: ["Standard", "HD"],
  },
  {
    name: "Stability AI",
    short: "S",
    description: "High fidelity generation",
    quality: ["Core", "Ultra"],
  },
  {
    name: "Gemini",
    short: "G",
    description: "Google Nano Banana (needs billing)",
    quality: ["Fast", "Quality"],
  },
  {
    name: "Hugging Face",
    short: "H",
    description: "FLUX, SDXL, Qwen, HiDream, SANA",
    quality: [...PROVIDER_QUALITY["Hugging Face"]],
  },
];

const styles: Array<{ name: StyleKey; detail: string; gradient: string }> = [
  { name: "Photorealistic", detail: "True to life", gradient: "style-photo" },
  { name: "Anime", detail: "Illustrated", gradient: "style-anime" },
  { name: "Cinematic", detail: "Film still", gradient: "style-cinematic" },
  { name: "3D", detail: "Rendered", gradient: "style-3d" },
  { name: "Fantasy", detail: "Otherworldly", gradient: "style-fantasy" },
  { name: "Cyberpunk", detail: "Neon future", gradient: "style-cyberpunk" },
  { name: "Digital Art", detail: "Expressive", gradient: "style-digital" },
  { name: "Minimalist", detail: "Quiet form", gradient: "style-minimal" },
];

const ratios: Array<{ value: RatioKey; label: string }> = [
  { value: "1:1", label: "Square" },
  { value: "16:9", label: "Landscape" },
  { value: "9:16", label: "Portrait" },
  { value: "4:3", label: "Classic" },
  { value: "3:4", label: "Tall" },
];

const presets: Preset[] = [
  {
    name: "YouTube thumbnails",
    description: "High-click visual hook",
    icon: "YT",
    accent: "preset-red",
    ratio: "16:9",
    prompt: "A bold, expressive YouTube thumbnail with a clear focal subject, high contrast lighting, punchy composition, and room for headline text",
  },
  {
    name: "Wallpapers",
    description: "Immersive desktop scene",
    icon: "W",
    accent: "preset-blue",
    ratio: "16:9",
    prompt: "An immersive atmospheric wallpaper with a sweeping sense of scale, elegant negative space, and subtle details that reward a closer look",
  },
  {
    name: "Movie posters",
    description: "Award-worthy key art",
    icon: "M",
    accent: "preset-gold",
    ratio: "3:4",
    prompt: "Prestige movie poster key art with a singular memorable silhouette, dramatic directional light, refined title-space, and an editorial color grade",
  },
  {
    name: "Product ads",
    description: "Conversion-ready product",
    icon: "P",
    accent: "preset-green",
    ratio: "4:3",
    prompt: "A premium product advertisement with precise studio lighting, tactile materials, clean art direction, and a confident, modern brand mood",
  },
  {
    name: "Character concepts",
    description: "Build a visual identity",
    icon: "C",
    accent: "preset-violet",
    ratio: "3:4",
    prompt: "A distinctive character concept sheet with a strong silhouette, layered costume details, expressive pose, and a visual story in every texture",
  },
  {
    name: "Fantasy landscapes",
    description: "Worlds beyond the map",
    icon: "F",
    accent: "preset-teal",
    ratio: "16:9",
    prompt: "A vast fantasy landscape at first light, ancient ruins, atmospheric depth, cinematic scale, and a small traveler to reveal the size of the world",
  },
  {
    name: "Social artwork",
    description: "Scroll-stopping story",
    icon: "S",
    accent: "preset-pink",
    ratio: "1:1",
    prompt: "A scroll-stopping social artwork with a singular idea, graphic clarity, rich texture, and a polished creator-brand finish",
  },
];

function LogoMark() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="section-label">
      <span>{children}</span>
      {action}
    </div>
  );
}

type HistoryItem = {
  id: string;
  prompt: string;
  style: StyleKey;
  ratio: RatioKey;
  provider: ProviderKey;
  mode: ModeKey;
  thumb: string;
  createdAt: number;
};

const DRAFT_KEY = "nova.studio.draft";
const HISTORY_KEY = "nova.studio.history";
const MAX_HISTORY = 12;
const DEFAULT_PROMPT =
  "A solitary glasshouse floating above a violet ocean at blue hour, bioluminescent gardens glowing inside, wide cinematic composition";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function loadHistory(): HistoryItem[] {
  const raw = readStorage(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.prompt === "string").slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function makeThumb(dataUrl: string, max = 240): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return resolve("");
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        resolve("");
      }
    };
    img.onerror = () => resolve("");
    img.src = dataUrl;
  });
}

function isMobileViewport() {
  return typeof window !== "undefined" && window.innerWidth <= 820;
}

function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobileViewport());
  const [selectedMode, setSelectedMode] = useState<ModeKey>("Smart Mode");
  const [prompt, setPrompt] = useState(() => readStorage(DRAFT_KEY) ?? DEFAULT_PROMPT);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [selectedStyle, setSelectedStyle] = useState<StyleKey>("Cinematic");
  const [selectedRatio, setSelectedRatio] = useState<RatioKey>("16:9");
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey>("Pollinations");
  const [selectedQuality, setSelectedQuality] = useState(PROVIDER_QUALITY.Pollinations[0]);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [resultPrompt, setResultPrompt] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const historyRef = useRef<HTMLDivElement>(null);

  const providersQuery = trpc.image.providers.useQuery(undefined, { staleTime: 60_000, retry: 1 });
  const generate = trpc.image.studioGenerate.useMutation();
  const isGenerating = generate.isPending;

  const statusByName = useMemo(() => {
    const map = new Map<string, { configured: boolean; detail: string }>();
    providersQuery.data?.forEach((item) => map.set(item.name, item));
    return map;
  }, [providersQuery.data]);

  const statusText = (name: ProviderKey) => {
    if (providersQuery.isLoading) return "Checking…";
    if (providersQuery.isError) return "Status unavailable";
    return statusByName.get(name)?.detail ?? "Unknown";
  };

  const readyCount = providersQuery.data?.filter((item) => item.configured).length ?? 0;

  const provider = useMemo(
    () => providers.find((item) => item.name === selectedProvider) ?? providers[0],
    [selectedProvider]
  );

  const activeImage: GeneratedImage | undefined = results[activeIndex];

  // Autosave the draft (really).
  useEffect(() => {
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      writeStorage(DRAFT_KEY, prompt);
      setSaveState("saved");
    }, 500);
    return () => window.clearTimeout(timer);
  }, [prompt]);

  // Close the lightbox with Escape.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const closeSidebarOnMobile = () => {
    if (isMobileViewport()) setSidebarOpen(false);
  };

  const chooseProvider = (name: ProviderKey) => {
    setSelectedProvider(name);
    setSelectedQuality(PROVIDER_QUALITY[name][0]);
    setShowProviderMenu(false);
    setGenerationError("");
  };

  const choosePreset = (preset: Preset) => {
    setActivePreset(preset.name);
    setPrompt(preset.prompt);
    setSelectedRatio(preset.ratio);
    setEnhanced(false);
    setGenerationError("");
  };

  const handleEnhance = () => {
    if (!prompt.trim()) {
      toast.info("Write a short idea first, then enhance it.");
      return;
    }
    if (enhanced) {
      toast.info("This prompt is already enhanced.");
      return;
    }
    setPrompt(enhancePrompt(prompt, selectedStyle));
    setActivePreset(null);
    setEnhanced(true);
    toast.success("Prompt enhanced");
  };

  const saveToHistory = useCallback(async (image: GeneratedImage, text: string, ratio: RatioKey, style: StyleKey, mode: ModeKey) => {
    const thumb = await makeThumb(image.dataUrl);
    const item: HistoryItem = {
      id: `${Date.now()}-${image.seed}`,
      prompt: text,
      style,
      ratio,
      provider: image.provider,
      mode,
      thumb,
      createdAt: Date.now(),
    };
    setHistory((current) => {
      const next = [item, ...current].slice(0, MAX_HISTORY);
      if (!writeStorage(HISTORY_KEY, JSON.stringify(next))) {
        writeStorage(HISTORY_KEY, JSON.stringify(next.slice(0, 4).map((entry) => ({ ...entry, thumb: "" }))));
      }
      return next;
    });
  }, []);

  const handleGenerate = () => {
    if (isGenerating) return;
    const text = prompt.trim();
    if (!text) {
      setGenerationError("Add a creative direction before generating.");
      return;
    }
    setGenerationError("");
    const request = {
      prompt: text,
      style: selectedStyle,
      ratio: selectedRatio,
      provider: selectedProvider,
      quality: selectedQuality,
      mode: selectedMode,
    };
    generate.mutate(request, {
      onSuccess: (data) => {
        setResults(data.images);
        setActiveIndex(0);
        setResultPrompt(text);
        const first = data.images[0];
        if (selectedMode !== "Multi-AI Mode" && first.provider !== selectedProvider) {
          toast.info(`${selectedProvider} was unavailable, so ${first.provider} created this image.`);
        } else {
          toast.success(data.images.length > 1 ? `${data.images.length} of ${data.attempts.length} models finished. Pick your favorite below.` : "Image ready");
        }
        void saveToHistory(first, text, request.ratio, request.style, request.mode);
      },
      onError: (error) => {
        setGenerationError(
          error.data?.code === "BAD_REQUEST"
            ? "Those settings were not accepted. Check your prompt and try again."
            : error.message || "Something went wrong. Please try again."
        );
      },
    });
  };

  const copyPrompt = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Prompt copied to clipboard");
    } catch {
      toast.error("Clipboard access is unavailable in this browser");
    }
  };

  const clearPrompt = () => {
    setPrompt("");
    setActivePreset(null);
    setEnhanced(false);
    setGenerationError("");
  };

  const handleDownload = () => {
    if (!activeImage) return;
    const extension = activeImage.mimeType.includes("jpeg") ? "jpg" : activeImage.mimeType.includes("webp") ? "webp" : "png";
    const link = document.createElement("a");
    link.href = activeImage.dataUrl;
    link.download = `nova-${selectedStyle.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const restoreFromHistory = (item: HistoryItem) => {
    setPrompt(item.prompt);
    setSelectedStyle(item.style);
    setSelectedRatio(item.ratio);
    setSelectedMode(item.mode);
    setActivePreset(null);
    setEnhanced(false);
    setGenerationError("");
    toast.success("Settings restored from history");
  };

  const clearHistory = () => {
    setHistory([]);
    writeStorage(HISTORY_KEY, "[]");
  };

  const scrollToHistory = () => {
    closeSidebarOnMobile();
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const ratioClass = selectedRatio.replace(":", "-");

  return (
    <div className="studio-shell">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}
      <aside className={`studio-sidebar ${sidebarOpen ? "is-open" : "is-collapsed"}`}>
        <div className="brand-lockup">
          <LogoMark />
          {sidebarOpen && (
            <div>
              <div className="brand-name">NOVA<span>AI</span></div>
              <div className="brand-version">CREATIVE OS <b>2.0</b></div>
            </div>
          )}
        </div>

        <button className="sidebar-toggle" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle sidebar" aria-expanded={sidebarOpen}>
          {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
        </button>

        <nav className="primary-nav" aria-label="Primary navigation">
          <div className="nav-eyebrow">CREATE</div>
          <button className="nav-item active" title="Image Studio" aria-current="page" onClick={closeSidebarOnMobile}>
            <Sparkles size={17} />
            {sidebarOpen && <span>Image Studio</span>}
          </button>
          <button className="nav-item" title="Canvas (coming soon)" disabled>
            <LayoutGrid size={17} />
            {sidebarOpen && <span>Canvas</span>}
            {sidebarOpen && <span className="nav-pill">SOON</span>}
          </button>
          <button className="nav-item" title="Collections (coming soon)" disabled>
            <Layers3 size={17} />
            {sidebarOpen && <span>Collections</span>}
            {sidebarOpen && <span className="nav-pill">SOON</span>}
          </button>
          <div className="nav-eyebrow nav-eyebrow-spaced">MANAGE</div>
          <button className="nav-item" title="Generation history" onClick={scrollToHistory}>
            <Clock3 size={17} />
            {sidebarOpen && <span>History</span>}
          </button>
          <button className="nav-item" title="Settings (coming soon)" disabled>
            <Settings2 size={17} />
            {sidebarOpen && <span>Settings</span>}
            {sidebarOpen && <span className="nav-pill">SOON</span>}
          </button>
        </nav>

        {sidebarOpen && (
          <div className="sidebar-bottom">
            <div className="usage-card">
              <div className="usage-topline"><span>PROVIDERS READY</span><span>{providersQuery.data ? `${readyCount}/${providers.length}` : "—"}</span></div>
              <div className="usage-track"><div style={{ width: `${(readyCount / providers.length) * 100}%` }} /></div>
              <div className="usage-footline"><span>Automatic fallback on</span></div>
            </div>
            <div className="profile-row">
              <div className="avatar">TE</div>
              <div className="profile-copy"><b>Tbate Editzzz</b><span>Creator account</span></div>
            </div>
          </div>
        )}
      </aside>

      <main className="studio-main">
        <header className="topbar">
          <div className="mobile-brand">
            <button className="icon-button mobile-menu" onClick={() => setSidebarOpen((open) => !open)} aria-label="Open navigation"><Menu size={19} /></button>
            <LogoMark />
            <div className="brand-name">NOVA<span>AI</span></div>
          </div>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Image Studio</strong></div>
          <div className="topbar-actions">
            <div className="top-avatar">TE</div>
          </div>
        </header>

        <div className="studio-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> GENERATIVE WORKSPACE</div>
              <h1>Make the impossible <em>visible.</em></h1>
              <p>Turn a thought into a visual system with NOVA’s creative pipeline.</p>
            </div>
            <div className="heading-meta">
              <span className="live-dot" />
              {providersQuery.isLoading ? "Checking providers…" : providersQuery.isError ? "Server unreachable" : `${readyCount} of ${providers.length} providers ready`}
            </div>
          </div>

          <section className="mode-surface" aria-label="Generation mode">
            <div className="mode-surface-heading">
              <div>
                <div className="section-label"><span>GENERATION MODE</span></div>
                <p>Choose the intelligence behind your next frame.</p>
              </div>
              <div className="mode-surface-status"><SlidersHorizontal size={14} /> Tuned for {selectedMode.replace(" Mode", "").toLowerCase()}</div>
            </div>
            <div className="mode-grid" role="radiogroup" aria-label="Generation modes">
              {generationModes.map((mode) => {
                const ModeIcon = mode.icon;
                const isActive = selectedMode === mode.name;
                return (
                  <button
                    key={mode.name}
                    className={`mode-card ${mode.accent} ${isActive ? "selected" : ""}`}
                    onClick={() => { setSelectedMode(mode.name); setGenerationError(""); }}
                    role="radio"
                    aria-checked={isActive}
                  >
                    <span className="mode-icon"><ModeIcon size={19} /></span>
                    <span className="mode-copy"><small>{mode.eyebrow}</small><b>{mode.name}</b><span>{mode.description}</span></span>
                    <span className="mode-meta">{mode.meta}</span>
                    <span className="mode-selection"><Check size={12} /></span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="studio-grid">
            <section className="control-column">
              <div className="glass-card prompt-card">
                <div className="card-header">
                  <SectionLabel>01 / ART DIRECTION</SectionLabel>
                  <span className="field-status" aria-live="polite"><span className="status-dot" /> {saveState === "saving" ? "Saving draft…" : "Draft saved"}</span>
                </div>
                <div className="prompt-wrap">
                  <textarea
                    aria-label="Image prompt"
                    value={prompt}
                    onChange={(event) => {
                      setPrompt(event.target.value);
                      setActivePreset(null);
                      setEnhanced(false);
                      setGenerationError("");
                    }}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                        event.preventDefault();
                        handleGenerate();
                      }
                    }}
                    placeholder="Describe the image you want to see..."
                    maxLength={MAX_PROMPT_LENGTH}
                  />
                  <div className="prompt-fade" />
                  <div className="prompt-tools">
                    <span>{prompt.length} / {MAX_PROMPT_LENGTH}</span>
                    <div className="prompt-tool-actions">
                      <button className="text-button" onClick={clearPrompt} disabled={!prompt}><X size={13} /> Clear</button>
                      <button className={`enhance-button ${enhanced ? "is-ready" : ""}`} onClick={handleEnhance} disabled={!prompt.trim()}><WandSparkles size={14} /> {enhanced ? "Enhanced" : "Enhance prompt"}</button>
                    </div>
                  </div>
                </div>
                <div className="prompt-suggestion"><Sparkles size={13} /><span>Try adding a subject, atmosphere, camera angle, and emotion.</span></div>
              </div>

              <div className="glass-card preset-card">
                <div className="card-header">
                  <SectionLabel>02 / CREATIVE PRESETS</SectionLabel>
                </div>
                <div className="preset-scroll">
                  {presets.map((preset) => (
                    <button key={preset.name} className={`preset-chip ${activePreset === preset.name ? "selected" : ""}`} onClick={() => choosePreset(preset)}>
                      <span className={`preset-icon ${preset.accent}`}>{preset.icon}</span>
                      <span className="preset-chip-copy"><b>{preset.name}</b><small>{preset.description}</small></span>
                      {activePreset === preset.name && <Check size={14} className="preset-check" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-card controls-card">
                <div className="card-header"><SectionLabel>03 / VISUAL SYSTEM</SectionLabel></div>
                <div className="control-block">
                  <div className="control-label"><span>Visual style</span><span className="control-note">{selectedStyle}</span></div>
                  <div className="style-grid">
                    {styles.map((style) => (
                      <button key={style.name} className={`style-tile ${selectedStyle === style.name ? "selected" : ""}`} onClick={() => setSelectedStyle(style.name)} aria-pressed={selectedStyle === style.name}>
                        <span className={`style-thumb ${style.gradient}`}><span /></span>
                        <span className="style-tile-copy"><b>{style.name}</b><small>{style.detail}</small></span>
                        {selectedStyle === style.name && <span className="selection-mark"><Check size={10} /></span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="control-divider" />
                <div className="control-block split-controls">
                  <div>
                    <div className="control-label"><span>Aspect ratio</span><span className="control-note">{selectedRatio}</span></div>
                    <div className="ratio-row">
                      {ratios.map((ratio) => (
                        <button key={ratio.value} className={`ratio-button ${selectedRatio === ratio.value ? "selected" : ""}`} onClick={() => setSelectedRatio(ratio.value)} aria-pressed={selectedRatio === ratio.value}>
                          <span className={`ratio-icon ratio-${ratio.value.replace(":", "-")}`} /><span>{ratio.value}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="quality-wrap">
                    <div className="control-label"><span>Quality</span><span className="control-note">Provider-aware</span></div>
                    <div className="quality-options">
                      {provider.quality.map((quality) => <button key={quality} className={`quality-button ${selectedQuality === quality ? "selected" : ""}`} onClick={() => setSelectedQuality(quality)} aria-pressed={selectedQuality === quality}><span className="quality-bar"><i /><i /><i /></span>{quality}</button>)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="generate-area">
                {generationError && <div className="generation-error" role="alert"><div className="error-icon">!</div><div><b>Generation failed</b><span>{generationError}</span></div><button onClick={() => setGenerationError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
                <button className={`generate-button ${isGenerating ? "is-loading" : ""}`} onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
                  <span className="generate-icon">{isGenerating ? <RefreshCw className="spin" size={18} /> : <Zap size={18} />}</span>
                  <span>{isGenerating ? "Generating…" : "Generate image"}</span>
                  {!isGenerating && <span className="generate-shortcut">{isMac ? "⌘ ↵" : "Ctrl ↵"}</span>}
                </button>
                <div className="generate-caption"><span>{selectedMode} · {selectedMode === "Masterpiece Mode" ? PROVIDER_QUALITY[selectedProvider][PROVIDER_QUALITY[selectedProvider].length - 1] : selectedQuality} via {selectedProvider}</span><span className="caption-separator">•</span><span>{selectedMode === "Multi-AI Mode" ? "every available model" : "1 image"}</span></div>
              </div>
            </section>

            <section className="preview-column">
              <div className="glass-card preview-card">
                <div className="preview-header">
                  <SectionLabel>LIVE CANVAS</SectionLabel>
                  <div className="preview-actions">
                    <button className="icon-button tiny" aria-label="Download image" onClick={handleDownload} disabled={!activeImage}><Download size={14} /></button>
                    <button className="icon-button tiny" aria-label="Copy prompt" onClick={copyPrompt}><Copy size={14} /></button>
                  </div>
                </div>
                <div className={`canvas-stage ratio-stage-${ratioClass}`}>
                  {activeImage ? (
                    <img className="canvas-image" src={activeImage.dataUrl} alt={resultPrompt || "Generated image"} />
                  ) : (
                    <>
                      <div className="canvas-orbit orbit-one" /><div className="canvas-orbit orbit-two" /><div className="canvas-glow" />
                      <div className="canvas-empty-state"><div className="empty-orb"><ImageIcon size={21} /></div><b>Your canvas is waiting</b><span>Generated visuals will appear here<br />in {selectedRatio} format.</span></div>
                    </>
                  )}
                  {isGenerating && (
                    <div className="canvas-loading" role="status" aria-live="polite">
                      <RefreshCw className="spin" size={22} />
                      <b>Creating your image…</b>
                      <span>{selectedMode === "Multi-AI Mode" ? "Running every available model" : `via ${selectedProvider}`} · this can take up to a minute</span>
                    </div>
                  )}
                  <div className="canvas-corner corner-top-left" /><div className="canvas-corner corner-top-right" /><div className="canvas-corner corner-bottom-left" /><div className="canvas-corner corner-bottom-right" />
                </div>
                {results.length > 1 && (
                  <div className="variation-strip" role="group" aria-label="Variations">
                    {results.map((image, index) => (
                      <button key={`${image.provider}-${image.seed}`} className={index === activeIndex ? "selected" : ""} onClick={() => setActiveIndex(index)} aria-label={`Variation ${index + 1}: ${image.provider} ${image.quality}`} aria-pressed={index === activeIndex}>
                        <img src={image.dataUrl} alt="" /><span>{image.provider} · {image.quality}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="preview-footer">
                  <div className="canvas-spec">
                    <span className="spec-label">{activeImage ? "ENGINE" : "OUTPUT"}</span><b>{activeImage ? `${activeImage.provider} · ${activeImage.quality}` : selectedRatio}</b>
                    <span className="spec-separator" /><span className="spec-label">STYLE</span><b>{selectedStyle}</b>
                  </div>
                  <button className="preview-expand" onClick={() => setExpanded(true)} disabled={!activeImage}><span>Expand canvas</span><Maximize2 size={14} /></button>
                </div>
              </div>

              <div className="glass-card provider-card">
                <div className="card-header"><SectionLabel>PIPELINE ROUTING</SectionLabel><span className="auto-badge"><span /> Auto fallback</span></div>
                <div className="provider-select-wrap">
                  <button className="provider-select" onClick={() => setShowProviderMenu((open) => !open)} aria-expanded={showProviderMenu} aria-haspopup="listbox">
                    <span className="provider-badge">{provider.short}</span><span className="provider-select-copy"><b>{provider.name}</b><small>{provider.description}</small></span><span className="provider-state"><span className="status-dot" /> {statusText(provider.name)}</span><ChevronDown size={16} className={showProviderMenu ? "chevron-up" : ""} />
                  </button>
                  {showProviderMenu && <div className="provider-menu" role="listbox">{providers.map((item) => <button key={item.name} role="option" aria-selected={item.name === selectedProvider} className={item.name === selectedProvider ? "selected" : ""} onClick={() => chooseProvider(item.name)}><span className="provider-badge mini">{item.short}</span><span><b>{item.name}</b><small>{statusText(item.name)}</small></span>{item.name === selectedProvider && <Check size={15} />}</button>)}</div>}
                </div>
                <div className="provider-note"><span className="route-line" /><span>Provider credentials stay server-side. If a provider fails or has no key, NOVA retries with the next available route.</span></div>
              </div>

              <div className="glass-card history-card" ref={historyRef}>
                <div className="card-header"><SectionLabel>RECENT GENERATIONS</SectionLabel>{history.length > 0 && <button className="subtle-link" onClick={clearHistory}>Clear <Trash2 size={13} /></button>}</div>
                {history.length === 0 ? (
                  <div className="history-empty"><div className="history-stack"><div /><div /><div /></div><div><b>No generations yet</b><span>Your recent prompts and settings are saved on this device after you generate.</span></div></div>
                ) : (
                  <div className="history-list">
                    {history.map((item) => (
                      <button key={item.id} className="history-item" onClick={() => restoreFromHistory(item)} title={item.prompt}>
                        {item.thumb ? <img src={item.thumb} alt="" /> : <span className="history-thumb-empty"><ImageIcon size={16} /></span>}
                        <span className="history-item-copy"><b>{item.prompt}</b><small>{item.style} · {item.ratio} · {item.provider}</small></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <footer className="studio-footer"><span>NOVA AI 2.0</span><span className="footer-line" /><span>Image Studio</span><span className="footer-spacer" /><span>Providers ready: <b>{providersQuery.data ? `${readyCount}/${providers.length}` : "…"}</b></span></footer>
        </div>
      </main>

      {expanded && activeImage && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Expanded image" onClick={() => setExpanded(false)}>
          <button className="icon-button lightbox-close" aria-label="Close expanded image" onClick={() => setExpanded(false)}><X size={18} /></button>
          <img src={activeImage.dataUrl} alt={resultPrompt || "Generated image"} onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

export default Home;
