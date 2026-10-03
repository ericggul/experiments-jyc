"use client";

import { useEffect, useMemo, useState } from "react";
import { loadLexicon, type Lexicon } from "./lexicon";
import LanguageRenderer from "./renderer";
import "./language.css";

// Slider position 0–100 maps logarithmically to 0.5–60 steps per second per unit.
const rateFrom = (position: number) => 0.5 * Math.pow(120, position / 100);

export default function LanguageTransfer({ clone }: { clone: string }) {
  const [lexicon, setLexicon] = useState<Lexicon | null>(null);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(72);
  const [coupling, setCoupling] = useState(35);
  const rate = rateFrom(speed);
  const settings = useMemo(() => ({ rate, coupling: coupling / 100 }), [rate, coupling]);

  useEffect(() => {
    let active = true;
    loadLexicon(clone).then((value) => { if (active) setLexicon(value); });
    return () => { active = false; };
  }, [clone]);

  return (
    <>
      {running && lexicon && <LanguageRenderer lexicon={lexicon} settings={settings} />}
      <div data-language-ui className="language-control">
        {open && (
          <div className="language-panel" role="group" aria-label="언어 전이 설정">
            <div className="language-modes">
              <button type="button" aria-pressed={!running} onClick={() => setRunning(false)}>원본</button>
              <button type="button" aria-pressed={running} onClick={() => setRunning(true)}>전이</button>
            </div>
            <label className="language-label" htmlFor="language-speed">속도 <strong>{rate < 10 ? rate.toFixed(1) : Math.round(rate)}/s</strong></label>
            <input id="language-speed" className="language-slider" type="range" min="0" max="100" step="1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
            <label className="language-label" htmlFor="language-coupling">동조 <strong>{coupling}%</strong></label>
            <input id="language-coupling" className="language-slider" type="range" min="0" max="100" step="1" value={coupling} onChange={(event) => setCoupling(Number(event.target.value))} />
          </div>
        )}
        <button type="button" className="language-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          언어
        </button>
      </div>
    </>
  );
}
