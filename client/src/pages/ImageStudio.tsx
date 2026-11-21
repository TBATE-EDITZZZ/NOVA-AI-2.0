import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import Home from "./Home";

export default function ImageStudio() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="mt-4 text-sm opacity-60">Loading NOVA Image Studio…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center px-5">
        <div className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center">
          <h1 className="text-2xl font-bold">NOVA Image Studio</h1>
          <p className="mt-3 text-sm leading-6 opacity-65">
            Sign in to access AI image generation, creative modes, and your image history.
          </p>
          <button
            type="button"
            onClick={() => startLogin()}
            className="mt-6 w-full rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-500"
          >
            Sign in to continue
          </button>
        </div>
      </div>
    );
  }

  return <Home />;
}
