"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { radius, spawnPoint, step, type Bubble, type Bounds, type Target } from "./model/physics";
import WordWheel from "./word-wheel";
import styles from "./mobile.module.css";

const FIRST = ["Artificial", "Generative", "Quantum", "Neural", "Autonomous", "Synthetic", "Spatial", "Decentralized", "Predictive", "Cognitive", "Immersive", "Superhuman"];
const SECOND = ["Intelligence", "Computing", "Reality", "Agents", "Networks", "Systems", "Automation", "Infrastructure", "Economy", "Future", "Singularity", "Revolution"];
const COLORS = ["#ffffff", "#ff6961", "#ffbd44", "#a5df76", "#69caff", "#b395ff", "#ff90ce"];
const LIMIT = 12;
type Sample = { x: number; y: number; time: number };
type Drag = { id: number; pointer: number; offsetX: number; offsetY: number; samples: Sample[] };

export default function BubbleFlick() {
  const stage = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const nextId = useRef(0);
  const bodies = useRef<Bubble[]>([]);
  const birthdays = useRef(new Map<number, number>());
  const bounds = useRef<Bounds>({ width: 390, height: 650 });
  const target = useRef<Target | null>(null);
  const drag = useRef<Drag | null>(null);
  const wake = useRef<() => void>(() => {});
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [held, setHeld] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState(FIRST[0]);
  const [second, setSecond] = useState(SECOND[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [full, setFull] = useState(false);

  useEffect(() => {
    let frame = 0;
    let previous = 0;
    const tick = (time: number) => {
      frame = 0;
      const elapsed = previous ? (time - previous) / 1000 : 1 / 60;
      bodies.current.forEach((b) => { b.age = (time - (birthdays.current.get(b.id) ?? time)) / 1000; });
      bodies.current = step(bodies.current, bounds.current, elapsed, target.current, 0);
      for (const id of birthdays.current.keys()) if (!bodies.current.some((b) => b.id === id)) birthdays.current.delete(id);
      previous = time;
      setBubbles(bodies.current);
      if (bodies.current.length > 0) frame = requestAnimationFrame(tick);
    };
    wake.current = () => { if (!frame && !document.hidden) { previous = 0; frame = requestAnimationFrame(tick); } };
    const stop = () => {
      target.current = null; drag.current = null; setHeld(null);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      bodies.current.forEach((b) => { b.vx = 0; b.vy = 0; });
    };
    const observer = new ResizeObserver(() => {
      if (!stage.current) return;
      stop();
      const rect = stage.current.getBoundingClientRect();
      // Scale the whole physical field on short/narrow viewports, never squeeze circles together.
      const scale = Math.min(1, rect.width / 390, rect.height / 560);
      stage.current.style.setProperty("--field-scale", String(scale));
      bounds.current = { width: rect.width / scale, height: (rect.height - 120 * scale) / scale };
      const placed: Bubble[] = [];
      for (const b of bodies.current) {
        const point = spawnPoint(placed, bounds.current);
        if (point) placed.push({ ...b, ...point, vx: 0, vy: 0 });
      }
      bodies.current = placed;
      setBubbles(placed);
      wake.current();
    });
    observer.observe(stage.current!);
    window.addEventListener("blur", stop);
    window.addEventListener("focus", wake.current);
    const visibility = () => { if (document.hidden) stop(); else wake.current(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); window.removeEventListener("blur", stop); window.removeEventListener("focus", wake.current); document.removeEventListener("visibilitychange", visibility); if (frame) cancelAnimationFrame(frame); wake.current = () => {}; };
  }, []);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  const point = (event: PointerEvent<HTMLButtonElement>): Sample => {
    const rect = stage.current!.getBoundingClientRect();
    const scale = rect.width / bounds.current.width;
    return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale, time: event.timeStamp };
  };
  const end = (event: PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    drag.current = null; target.current = null; setHeld(null);
    const b = bodies.current.find((item) => item.id === active.id);
    if (b) {
      const last = point(event);
      const first = active.samples.find((s) => last.time - s.time <= 100) ?? last;
      const elapsed = Math.max(1, last.time - first.time);
      b.vx = cancelled ? 0 : Math.max(-1600, Math.min(1600, (last.x - first.x) / elapsed * 1000));
      b.vy = cancelled ? 0 : Math.max(-1600, Math.min(1600, (last.y - first.y) / elapsed * 1000));
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    wake.current();
  };

  return (
    <main ref={stage} className={styles.page} aria-label="키워드 버블">
      <div className={styles.field}>
        {bubbles.map((bubble) => <button
          key={bubble.id} type="button" className={styles.bubble} data-held={held === bubble.id || undefined}
          style={{ transform: `translate3d(${bubble.x - radius(bubble)}px, ${bubble.y - radius(bubble)}px, 0)`, width: radius(bubble) * 2, height: radius(bubble) * 2, "--bubble-color": bubble.color, "--label-scale": radius(bubble) / 42 } as CSSProperties}
          aria-label={`${bubble.words.join(" ")}. 드래그하거나 방향키로 밀기`}
          onKeyDown={(event) => {
            const directions: Record<string, [number, number]> = { ArrowUp: [0, -350], ArrowDown: [0, 350], ArrowLeft: [-350, 0], ArrowRight: [350, 0] };
            const direction = directions[event.key];
            if (!direction) return;
            event.preventDefault();
            const body = bodies.current.find((b) => b.id === bubble.id);
            if (body) { [body.vx, body.vy] = direction; wake.current(); }
          }}
          onPointerDown={(event) => {
            if (drag.current || (event.pointerType === "mouse" && event.button !== 0)) return;
            event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
            const p = point(event);
            drag.current = { id: bubble.id, pointer: event.pointerId, offsetX: bubble.x - p.x, offsetY: bubble.y - p.y, samples: [p] };
            target.current = { id: bubble.id, x: bubble.x, y: bubble.y };
            setHeld(bubble.id); wake.current();
          }}
          onPointerMove={(event) => {
            const active = drag.current;
            if (!active || active.pointer !== event.pointerId) return;
            const p = point(event);
            active.samples = [...active.samples.filter((s) => p.time - s.time <= 100), p];
            target.current = { id: active.id, x: p.x + active.offsetX, y: p.y + active.offsetY };
            wake.current();
          }}
          onPointerUp={(e) => end(e, false)} onPointerCancel={(e) => end(e, true)} onLostPointerCapture={(e) => end(e, true)}
        ><span>{bubble.words[0]}<br />{bubble.words[1]}</span></button>)}
      </div>
      <button type="button" className={styles.add} aria-label="버블 설정" onClick={() => { setFull(false); setFirst(FIRST[0]); setSecond(SECOND[0]); setOpen(true); }}>+</button>
      <dialog ref={dialog} className={styles.modal} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) setOpen(false); } }} aria-label="버블 설정">
        {open && <>
          <div className={styles.modalHeader}><button type="button" onClick={() => setOpen(false)}>취소</button><button type="button" className={styles.create} onClick={() => {
            const location = spawnPoint(bodies.current, bounds.current);
            if (!location || bodies.current.length >= LIMIT) { setFull(true); return; }
            const id = nextId.current++;
            birthdays.current.set(id, performance.now());
            bodies.current = [...bodies.current, { id, age: 0, ...location, vx: 0, vy: 0, words: [first, second], color }];
            setBubbles(bodies.current); wake.current(); setOpen(false);
          }}>만들기</button></div>
          <div className={styles.wheels}><WordWheel label="첫단어" words={FIRST} onChange={setFirst} /><WordWheel label="둘째단어" words={SECOND} onChange={setSecond} /></div>
          <div className={styles.colors} role="group" aria-label="버블 색">
            {COLORS.map((value, index) => <button type="button" key={value} className={styles.swatch} style={{ "--swatch": value } as CSSProperties} aria-label={["흰색", "빨강", "노랑", "초록", "파랑", "보라", "분홍"][index]} aria-pressed={value === color} onClick={() => setColor(value)} />)}
          </div>
          {full && <p className={styles.message} role="status">버블을 더 놓을 공간이 없습니다.</p>}
        </>}
      </dialog>
    </main>
  );
}
