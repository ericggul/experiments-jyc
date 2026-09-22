import { useEffect, useRef } from "react";
import { sampleEyeBlinkPlan, sampleFirstBlinkDelay } from "../model/eye-blink-timing";
import { techPowerFaces } from "../model/tech-power-faces.generated";

const positions = ["0% 0%", "50% 0%", "100% 0%", "0% 100%", "50% 100%"];

export function TechEyeBlink({ index, gradient, active }: {
  index: number;
  gradient?: string;
  active: boolean;
}) {
  const surface = useRef<HTMLSpanElement>(null);
  const eyelid = useRef<HTMLSpanElement>(null);
  const person = techPowerFaces[index % techPowerFaces.length]!;
  const source = `/images/0922/tech-eye-blink/${person.id}.webp`;

  useEffect(() => {
    const element = surface.current;
    const lid = eyelid.current;
    if (!element || !lid) return;
    element.style.visibility = "hidden";
    let disposed = false;
    let loaded = false;
    let timer: number | undefined;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const canBlink = () => active && loaded && !disposed && !motion.matches && !document.hidden;
    const showFrame = (frame: number) => {
      lid.style.backgroundPosition = `center, ${positions[frame]}`;
      element.dataset.blinkFrame = String(frame);
    };
    const stop = () => {
      window.clearTimeout(timer);
      showFrame(0);
    };
    const schedule = (delay: number, secondOfPair = false) => {
      if (!canBlink()) return;
      timer = window.setTimeout(() => {
        if (!canBlink()) return;
        const plan = sampleEyeBlinkPlan(Math.random);
        const advance = (step: number) => {
          if (!canBlink()) { stop(); return; }
          const current = plan.steps[step]!;
          showFrame(current.frame);
          if (step < plan.steps.length - 1) {
            timer = window.setTimeout(() => advance(step + 1), current.holdMs);
          } else {
            // A double blink is a pair, never an unbounded rapid chain.
            schedule(secondOfPair ? 2600 + Math.random() * 4200 : plan.nextDelayMs,
              !secondOfPair && plan.isDoubleBlink);
          }
        };
        advance(0);
      }, delay);
    };
    const resume = () => {
      stop();
      // Original photograph remains visible for reduced motion and load failure.
      element.style.visibility = loaded && !motion.matches ? "visible" : "hidden";
      schedule(sampleFirstBlinkDelay(Math.random));
    };
    const image = new Image();
    image.onload = () => { if (!disposed) { loaded = true; resume(); } };
    // Only decode sheets for visible bubbles; inactive cells retain the photo.
    if (active) image.src = source;
    document.addEventListener("visibilitychange", resume);
    motion.addEventListener("change", resume);
    return () => {
      disposed = true;
      stop();
      image.onload = null;
      document.removeEventListener("visibilitychange", resume);
      motion.removeEventListener("change", resume);
    };
  }, [active, index, source]);

  const image = active ? `${gradient ?? "linear-gradient(transparent, transparent)"}, url("${source}")` : undefined;
  const photograph = {
    backgroundImage: image,
    backgroundBlendMode: gradient ? "color, normal" : "normal",
    backgroundSize: "100% 100%, 300% 200%",
    backgroundPosition: "center, 0% 0%",
    backgroundRepeat: "no-repeat",
  };

  return <span ref={surface} data-tech-eye-blink={index} style={{
    position: "absolute", inset: 0, visibility: "hidden", pointerEvents: "none",
    ...photograph,
  }}>
    <span ref={eyelid} style={{
      position: "absolute", inset: 0, ...photograph,
      // Keep the surrounding photograph still. Feather only the eyelid region
      // so generated frame-to-frame skin/eyebrow drift does not move the face.
      maskImage: "radial-gradient(ellipse 44% 26% at 50% 53%, #000 65%, transparent 100%)",
    }} />
  </span>;
}
