import { Hero } from "./components/Hero";
import { Leaderboard } from "./components/Leaderboard";
import { Findings } from "./components/Findings";
import { DistanceLadder } from "./components/DistanceLadder";
import { MissMap } from "./components/MissMap";
import { Matchups } from "./components/Matchups";
import { Value } from "./components/Value";
import { Explorer } from "./components/Explorer";
import { Method } from "./components/Method";
import "./site.css";

export default function App() {
  return (
    <>
      <Hero />
      <main>
        <Findings />
        <Leaderboard />
        <DistanceLadder />
        <MissMap />
        <Matchups />
        <Value />
        <Explorer />
        <Method />
      </main>
      <footer className="wrap footer small">
        <span>GeoGuessBench is a sibling of <a href="https://geoduel-alpha.vercel.app">GeoDuel</a>, where you can race the open models live on fresh photos.</span>
        <span className="muted">Photos from Panoramax and KartaView contributors, CC BY-SA 4.0. Map data Natural Earth.</span>
      </footer>
    </>
  );
}
