import { Wordmark } from "./Brand";
import { PoweredByTogether } from "./Together";

const X = (
  <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23 22h-6.3l-4.9-6.4L6.2 22H3.1l7.3-8.3L1 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z" /></svg>
);

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div className="f-brand">
          <a href="#top" className="f-wm"><Wordmark size={24} /></a>
          <p className="small">An open GeoGuessr benchmark for AI models.</p>
          <PoweredByTogether className="f-powered" />
        </div>
        <nav className="f-col small" aria-label="Sections">
          <span className="f-h">On this page</span>
          <a href="#leaderboard">Leaderboard</a>
          <a href="#distance">Distance</a>
          <a href="#photos">Photos</a>
          <a href="#method">Method</a>
        </nav>
        <div className="f-col small">
          <span className="f-h">Credits</span>
          <p className="f-built">
            Built by <a href="https://x.com/youssefuiux" target="_blank" rel="noreferrer" className="f-x">{X}Youssef</a> and <a href="https://x.com/nutlope" target="_blank" rel="noreferrer" className="f-x">{X}Hassan</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
