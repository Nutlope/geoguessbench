import { useEffect, useState } from "react";
import { ROWS, META, fmt } from "../data";
import { Wordmark } from "./Brand";
import { Leaderboard } from "./Leaderboard";

const LINKS = [
  ["#leaderboard", "Ranking"],
  ["#round", "Example round"],
  ["#photos", "Photos"],
  ["#method", "Method"],
] as const;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="wrap nav-in">
        <a href="#top" aria-label="GeoGuessBench home"><Wordmark size={24} /></a>
        <div className="nav-links">
          {LINKS.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </div>
        <a className="btn ghost nav-cta" href="https://geoduel-alpha.vercel.app" target="_blank" rel="noreferrer">Play GeoDuel</a>
      </div>
    </nav>
  );
}

export function Hero() {
  const updated = new Date(`${META.updated}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <header className="hero" id="top">
      <div className="wrap hero-copy">
        <p className="pill small">
          <span className="pill-dot" />
          {META.version} · {ROWS.length} models · {META.photos} photos · updated {updated}
        </p>
        <h1>Can AI play <span className="h1-2">GeoGuessr?</span></h1>
        <p className="lead">We show every model the same street photos and score its pin with GeoGuessr's own formula.</p>
        <div className="hero-ctas">
          <a className="btn" href="#round">Watch a round</a>
          <a className="btn ghost" href="#photos">Guess the photos yourself</a>
        </div>
      </div>
      <div className="wrap hero-board">
        <Leaderboard />
        <p className="hero-meta small muted tnum">
          {fmt(META.totalCalls)} guesses across {META.games} games in {META.countries} countries · ${META.totalCost.toFixed(2)} of API time
        </p>
      </div>
    </header>
  );
}
