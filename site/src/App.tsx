import { Hero } from "./components/Hero";
import { Leaderboard } from "./components/Leaderboard";
import { Findings } from "./components/Findings";
import { DistanceLadder } from "./components/DistanceLadder";
import { MissMap } from "./components/MissMap";
import { Matchups } from "./components/Matchups";
import { Value } from "./components/Value";
import { Explorer } from "./components/Explorer";
import { Method } from "./components/Method";
import { Footer } from "./components/Footer";
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
      <Footer />
    </>
  );
}
