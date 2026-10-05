"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { particleBudget } from "../model/field";
import { createPeers } from "./peers";
import { Scene } from "./scene";

// The page each Chrome app window shows. Loaded only in the browser (no
// server render): it reads its own place on the desktop and its peers'.
// Parameters arrive in the query: run, window index, window count, colour
// and link range in points.

function readParams() {
  const query = new URLSearchParams(window.location.search);
  const id = Number(query.get("i"));
  const count = Number(query.get("n"));
  const range = Number(query.get("r"));
  const color = `#${query.get("c") ?? ""}`;
  const partner = `#${query.get("p") ?? ""}`;
  const form = query.get("f") === "cubes" ? "cubes" as const : "clouds" as const;
  const run = query.get("run") ?? "";
  if (!/^[a-z0-9]{1,16}$/.test(run) || !Number.isInteger(id) || !Number.isInteger(count) || count < 2 || count > 8 || id < 0 || id >= count || !(range > 0) || !/^#[0-9a-f]{6}$/i.test(color) || !/^#[0-9a-f]{6}$/i.test(partner)) return null;
  return { id, count, range, color, partner, form, run };
}

export default function FieldWindow() {
  const [params] = useState(readParams);
  const [reducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const peers = useMemo(() => (params ? createPeers(`scc-desktop-collage-p2-${params.run}`, { id: params.id, color: params.color, partner: params.partner }) : null), [params]);

  useEffect(() => {
    if (!peers) return;
    document.title = "​";
    peers.connect();
    const leave = () => peers.disconnect();
    window.addEventListener("pagehide", leave);
    return () => { window.removeEventListener("pagehide", leave); leave(); };
  }, [peers]);

  if (!params || !peers) return <p style={{ color: "#fff", font: "12px monospace", padding: 16 }}>Missing window parameters.</p>;

  return (
    <>
      <style>{`html,body{margin:0;background:${params.form === "cubes" ? "#000" : "#05040c"};overflow:hidden}`}</style>
      <Canvas
        orthographic
        dpr={1}
        frameloop="demand"
        gl={{ antialias: true, powerPreference: "low-power" }}
        camera={{ manual: true, position: [0, 0, 2.5], near: -10000, far: 10000 }}
        style={{ position: "fixed", inset: 0 }}
      >
        <Scene form={params.form} peers={peers} selfId={params.id} range={params.range} budget={particleBudget(params.count)} reducedMotion={reducedMotion} />
      </Canvas>
    </>
  );
}
