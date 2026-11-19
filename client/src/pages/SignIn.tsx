import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { startGoogleLogin } from "@/const";

function NovaMark() {
  return (
    <svg className="nova-signin-mark" viewBox="0 0 100 100" role="img" aria-label="Nova AI logo">
      <path d="M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0 Z" fill="currentColor" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg className="nova-google-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.21c0-.72-.06-1.42-.18-2.09H12v3.96h5.23a4.47 4.47 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.92-4.18 2.92-7.26Z" />
      <path fill="#34A853" d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.5Z" />
      <path fill="#FBBC05" d="M6.54 13.58A5.86 5.86 0 0 1 6.23 12c0-.55.11-1.09.31-1.58V7.89H3.3A9.5 9.5 0 0 0 2.25 12c0 1.48.35 2.88 1.05 4.11l3.24-2.53Z" />
      <path fill="#EA4335" d="M12 6.39c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.49 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.7 5.39l3.24 2.53C6.85 8.11 9 6.39 12 6.39Z" />
    </svg>
  );
}

export default function SignIn() {
  return (
    <main className="nova-signin-screen">
      <div className="nova-signin-glow nova-signin-glow-one" aria-hidden="true" />
      <div className="nova-signin-glow nova-signin-glow-two" aria-hidden="true" />

      <motion.section
        className="nova-signin-hero"
        initial={{ opacity: 0, x: -32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="nova-signin-brand">
          <NovaMark />
          <span>Nova AI</span>
        </div>
        <div className="nova-signin-orbit" aria-hidden="true">
          <span className="nova-orbit-ring ring-one" />
          <span className="nova-orbit-ring ring-two" />
          <span className="nova-orbit-ring ring-three" />
          <span className="nova-orbit-node node-one" />
          <span className="nova-orbit-node node-two" />
          <span className="nova-orbit-node node-three" />
          <NovaMark />
        </div>
        <div className="nova-signin-hero-copy">
          <span className="nova-signin-eyebrow">NEURAL OBSERVATION &amp; VERIFICATION ASSISTANT</span>
          <h1>Ask Nova<br />anything<span>.</span></h1>
          <p>Sign in to pick up your conversations right where you left off.</p>
        </div>
        <div className="nova-signin-hero-foot"><span>DISCOVERY ENGINE</span><span className="nova-signin-foot-line" /><span>SCIENCE, CONNECTED.</span></div>
      </motion.section>

      <motion.section
        className="nova-signin-panel"
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="nova-signin-panel-inner">
          <Link className="nova-signin-back" href="/"><ArrowLeft size={15} /> Back to discovery</Link>
          <div className="nova-signin-heading">
            <span className="nova-signin-kicker">SECURE ACCESS</span>
            <h2>Welcome back</h2>
            <p>Sign in to your Nova AI account.</p>
          </div>

          <motion.button
            type="button"
            className="nova-google-button"
            onClick={() => startGoogleLogin()}
            whileHover={{ y: -2, boxShadow: "0 14px 30px rgba(157, 140, 255, .22)" }}
            whileTap={{ scale: 0.985 }}
          >
            <GoogleMark />
            <span>Continue with Google</span>
            <ArrowRight size={17} />
          </motion.button>

          <div className="nova-signin-divider"><span /> <em>or</em> <span /></div>

          <div className="nova-signin-provider-note">
            <ShieldCheck size={17} />
            <p><strong>One secure account.</strong><br />Google handles your credentials; NOVA keeps your research private.</p>
          </div>

          <p className="nova-signin-help">New to Nova? <Link href="/nova">Explore as a guest</Link></p>
          <p className="nova-signin-legal">By continuing, you use Google’s official sign-in flow and agree to return to the NOVA research workspace.</p>
        </div>
      </motion.section>
    </main>
  );
}
