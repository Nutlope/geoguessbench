import { Nav, Hero } from "./components/Hero";
import { Findings } from "./components/Findings";
import { Round } from "./components/Round";
import { DistanceLadder } from "./components/DistanceLadder";
import { Matchups } from "./components/Matchups";
import { Value } from "./components/Value";
import { Explorer } from "./components/Explorer";
import { Method } from "./components/Method";
import { Footer } from "./components/Footer";
import "./site.css";

export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      <main>
        <Findings />
        <Round />
        <DistanceLadder />
        <Matchups />
        <Value />
        <Explorer />
        <Method />
      </main>
      <Footer />
    </>
  );
}
