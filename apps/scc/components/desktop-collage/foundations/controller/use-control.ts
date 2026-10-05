"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Display, Outcome } from "../surfaces";

export type ControlStatus<Settings> = {
  enabled: boolean;
  running: boolean;
  /** Windows are being moved after opening. */
  moving?: boolean;
  message: string;
  display?: Display;
  /** Windows this page has opened and not yet cleared, on every surface. */
  open: number;
  progress: number;
  total: number;
  result?: Outcome;
  settings?: Settings;
};

const initial: ControlStatus<never> = { enabled: false, running: false, message: "Connecting…", open: 0, progress: 0, total: 0 };

/**
 * Polls the control endpoint and measures the Mac's desktop on load and
 * whenever this page regains focus; every run measures it again server-side.
 */
export function useControl<Settings>(endpoint: string) {
  const [status, setStatus] = useState<ControlStatus<Settings>>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const send = useCallback(async (action: "measure" | "start" | "stop" | "clear", settings?: Settings) => {
    if (inFlight.current && action !== "stop") return;
    inFlight.current = true;
    if (action !== "measure") setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, settings }) });
      const next = await response.json();
      if (!response.ok && response.status !== 409) throw new Error(next.message || "Could not run.");
      setStatus(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not run.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [endpoint]);

  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (!inFlight.current) {
          const response = await fetch(endpoint, { cache: "no-store", signal: abort.signal });
          const next = await response.json();
          if (!response.ok) throw new Error(next.message);
          if (!inFlight.current) setStatus(next);
        }
      } catch (reason) {
        if (!abort.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not connect.");
      } finally {
        if (!abort.signal.aborted) timer = setTimeout(poll, 400);
      }
    }
    void poll();
    const remeasure = () => void send("measure");
    const first = setTimeout(remeasure, 0);
    window.addEventListener("focus", remeasure);
    return () => { abort.abort(); clearTimeout(timer); clearTimeout(first); window.removeEventListener("focus", remeasure); };
  }, [endpoint, send]);

  return { status, busy, error, send };
}
