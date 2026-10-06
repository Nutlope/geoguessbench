import { useEffect, useState } from "react";
import { META, fmt } from "../data";
import { Wordmark } from "./Brand";
import { Leaderboard } from "./Leaderboard";

const LINKS = [
  ["#leaderboard", "Ranking"],
  ["#round", "Example round"],
  ["#photos", "Photos"],
  ["#method", "Method"],
] as const;

const REPO = "Nutlope/geoguessbench";
const GH = "M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z";

/** GitHub link with the live star count (hidden if GitHub can't be reached). */
function GitHubStars() {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    fetch(`https://api.github.com/repos/${REPO}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => typeof d?.stargazers_count === "number" && setStars(d.stargazers_count))
      .catch(() => {});
  }, []);
  return (
    <a className="btn ghost nav-gh" href={`https://github.com/${REPO}`} target="_blank" rel="noreferrer" aria-label={stars == null ? "GitHub repository" : `Star on GitHub, ${stars} stars`}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d={GH} fill="currentColor" /></svg>
      <span className="nav-gh-txt">Star</span>
      {stars != null && <span className="nav-gh-n tnum">{fmt(stars)}</span>}
    </a>
  );
}

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
        <div className="nav-actions">
          <GitHubStars />
          <a className="btn ghost nav-cta" href="https://geoduel-alpha.vercel.app" target="_blank" rel="noreferrer">Play GeoDuel</a>
        </div>
      </div>
    </nav>
  );
}

export function Hero() {
  return (
    <header className="hero" id="top">
      <div className="wrap hero-copy">
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
          {fmt(META.totalCalls)} guesses across {META.games} games in {META.countries} countries
        </p>
      </div>
    </header>
  );
}
