import { useState } from "react";
import { Download, ImagePlus, LoaderCircle, Sparkles } from "lucide-react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type ImageProvider = "auto" | "cloudflare" | "pollinations" | "stability";

type GeneratedImage = {
  url: string;
  prompt: string;
  createdAt: string;
  provider?: string;
};

export default function ImageStudio() {
  const { user, loading: authLoading } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState<"medium" | "high">("medium");
  const [provider, setProvider] = useState<ImageProvider>("auto");
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);

  const generate = trpc.image.generate.useMutation({
    onSuccess: (result) => {
      const image: GeneratedImage = {
        url: result.url,
        prompt,
        createdAt: new Date().toLocaleTimeString(),
        provider: result.provider,
      };

      setCurrentImage(image);
      setHistory((previous) => [image, ...previous].slice(0, 8));
    },
  });

  function handleGenerate() {
    if (!user) {
      startLogin();
      return;
    }

    if (prompt.trim().length < 3 || generate.isPending) return;

    generate.mutate({
      prompt: prompt.trim(),
      quality,
      provider,
    });
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-violet-500">
          <Sparkles size={14} />
          NOVA CREATIVE INTELLIGENCE
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
          Image Studio
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 opacity-70 sm:text-base">
          Turn your imagination into images with NOVA AI.
          Describe what you want to create and let the image engine do the rest.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
          <label className="mb-3 block text-sm font-semibold" htmlFor="image-prompt">
            Describe your image
          </label>

          <textarea
            id="image-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={2000}
            rows={7}
            placeholder="Example: A futuristic science laboratory floating above Earth, cinematic lighting, highly detailed..."
            className="w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 text-sm outline-none transition focus:border-violet-500"
          />

          <div className="mt-2 text-right text-xs opacity-50">
            {prompt.length}/2000
          </div>

          <label className="mb-2 mt-5 block text-sm font-semibold" htmlFor="image-quality">
            Image quality
          </label>

          <select
            id="image-quality"
            value={quality}
            onChange={(event) => setQuality(event.target.value as "medium" | "high")}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 text-sm outline-none focus:border-violet-500"
          >
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <label className="mb-2 mt-5 block text-sm font-semibold" htmlFor="image-provider">
            Image provider
          </label>

          <select
            id="image-provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as ImageProvider)}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 text-sm outline-none focus:border-violet-500"
          >
            <option value="auto">Automatic — try all providers</option>
            <option value="cloudflare">Cloudflare — FLUX.1 Schnell</option>
            <option value="pollinations">Pollinations — FLUX.1 Schnell</option>
            <option value="stability">Stability AI — Stable Image Core</option>
          </select>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={authLoading || generate.isPending || prompt.trim().length < 3}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generate.isPending ? (
              <>
                <LoaderCircle size={18} className="animate-spin" />
                Creating your image...
              </>
            ) : !user ? (
              <>
                <Sparkles size={18} />
                Sign in to generate
              </>
            ) : (
              <>
                <ImagePlus size={18} />
                Generate image
              </>
            )}
          </button>

          <p className="mt-3 text-center text-xs opacity-50">
            Image generation uses paid API credits.
          </p>

          {generate.error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
            >
              {generate.error.message}
            </div>
          )}
        </div>

        <div className="flex min-h-[360px] flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Preview</h2>
            <span className="text-xs opacity-50">1024 × 1024</span>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg)]">
            {generate.isPending ? (
              <div className="p-8 text-center">
                <LoaderCircle size={38} className="mx-auto animate-spin text-violet-500" />
                <p className="mt-4 text-sm font-medium">NOVA is creating your image</p>
                <p className="mt-2 text-xs opacity-50">This may take a little while.</p>
              </div>
            ) : currentImage ? (
              <img
                src={currentImage.url}
                alt={currentImage.prompt}
                className="h-full max-h-[560px] w-full object-contain"
              />
            ) : (
              <div className="p-8 text-center">
                <ImagePlus size={42} className="mx-auto opacity-30" />
                <p className="mt-4 font-medium">Your image will appear here</p>
                <p className="mt-2 text-sm opacity-50">
                  Enter a prompt to create your first image.
                </p>
              </div>
            )}
          </div>

          {currentImage && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="max-w-[65%] truncate text-xs opacity-60">
                  {currentImage.prompt}
                </p>
                {currentImage.provider && (
                  <p className="mt-1 text-xs text-violet-400">
                    Provider: {currentImage.provider}
                  </p>
                )}
              </div>
              <a
                href={currentImage.url}
                download="nova-generated-image.png"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--bg)]"
              >
                <Download size={16} />
                Download
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent creations</h2>
          <span className="text-xs opacity-50">{history.length} images</span>
        </div>

        {history.length === 0 ? (
          <p className="rounded-xl border border-[var(--line)] p-5 text-sm opacity-60">
            Your recent images will appear here during this session.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {history.map((image, index) => (
              <button
                type="button"
                key={`${image.createdAt}-${index}`}
                onClick={() => setCurrentImage(image)}
                className="overflow-hidden rounded-xl border border-[var(--line)] text-left transition hover:border-violet-500"
              >
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="aspect-square w-full object-cover"
                />
                <span className="block truncate p-3 text-xs opacity-70">
                  {image.prompt}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
