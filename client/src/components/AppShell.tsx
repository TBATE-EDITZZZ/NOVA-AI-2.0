import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, LogOut, Menu, Moon, Sun, UserRound, Volume2, VolumeX, X } from "lucide-react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import BrandMark from "./BrandMark";
import CinematicIntro from "./CinematicIntro";
import { useInteractionEffects } from "./useInteractionEffects";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Discoveries", href: "/discoveries" },
  { label: "Explorer", href: "/explorer" },
  { label: "Laboratory", href: "/laboratory" },
  { label: "Live intelligence", href: "/live" },
  { label: "Research", href: "/research" },
  { label: "Visual studio", href: "/visualization" },
  { label: "Image Studio", href: "/image-studio" },
  { label: "Knowledge", href: "/knowledge" },
  { label: "Learning", href: "/learning" },
  { label: "My Library", href: "/library" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(() => {
    try {
      return window.sessionStorage.getItem("nova-intro-seen") !== "1";
    } catch {
      return true;
    }
  });
  const { theme, toggleTheme } = useTheme();
  const { user, loading, logout } = useAuth();
  const { soundEnabled, toggleSound } = useInteractionEffects();
  const initials = user?.name?.trim()?.slice(0, 1).toUpperCase() || "";
  const dismissIntro = useCallback(() => {
    try {
      window.sessionStorage.setItem("nova-intro-seen", "1");
    } catch {
      // Continue if session storage is unavailable.
    }
    setIntroOpen(false);
  }, []);

  return (
    <div className="app-frame">
      <div className="topline"><span><i /> SCIENCE, CONNECTED.</span><span className="topline-right">NOVA · NEURAL OBSERVATION &amp; VERIFICATION ASSISTANT</span></div>
      <header className="site-header">
        <BrandMark />
        <nav className={`primary-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
          {navigation.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`nav-link${path === item.href ? " active" : ""}`}>
              {item.label}
            </Link>
          ))}
          <Link href="/nova" onClick={() => setMenuOpen(false)} className={`nav-nova${path === "/nova" ? " active" : ""}`}>
            <span className="nova-spark" aria-hidden="true">✳</span> Ask NOVA <ArrowUpRight size={14} />
          </Link>
        </nav>
        <div className="header-actions">
          <button className="icon-button theme-toggle" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"} onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            className={`icon-button sound-toggle${soundEnabled ? " is-on" : ""}`}
            aria-label={soundEnabled ? "Mute interface sounds" : "Enable interface sounds"}
            aria-pressed={soundEnabled}
            title={soundEnabled ? "Mute interface sounds" : "Enable interface sounds"}
            onClick={toggleSound}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>SFX</span>
          </button>
          {loading ? <span className="avatar avatar-pending" aria-label="Checking sign-in status" /> : user ? (
            <div className="profile-control">
              <button className="avatar" title={user.name ?? "Signed in"} aria-label={`Account menu for ${user.name ?? "user"}`} aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(value => !value)}>{initials || <UserRound size={15} />}</button>
              {profileOpen && <div className="profile-menu" role="menu" onKeyDown={event => { if (event.key === "Escape") setProfileOpen(false); }}><span className="profile-menu-name">{user.name || user.email || "Signed in"}</span><Link href="/library" role="menuitem" onClick={() => setProfileOpen(false)}>My research library <ArrowUpRight size={13} /></Link><button role="menuitem" onClick={() => void logout().catch(() => undefined).finally(() => setProfileOpen(false))}><LogOut size={13} /> Sign out</button></div>}
            </div>
          ) : (
            <button className="sign-in" onClick={() => startLogin()}><UserRound size={15} /><span>Continue with Google</span></button>
          )}
          <button className="icon-button menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <div className="footer-brand"><BrandMark compact /><p>Every question opens a new universe.</p></div>
        <div className="footer-links"><Link href="/nova">Ask NOVA</Link><Link href="/live">Live intelligence</Link><Link href="/explorer">Explore science</Link><Link href="/learning">Learning</Link><Link href="/library">My library</Link></div>
        <div className="footer-note">DISCOVERY ENGINE <span>·</span> Evidence first, wonder always.</div>
      </footer>
      {introOpen && <CinematicIntro onDismiss={dismissIntro} />}
    </div>
  );
}
