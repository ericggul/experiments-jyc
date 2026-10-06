"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { browserStatus, clearBrowser, measureBrowser, startBrowser, stopBrowser, subscribeBrowser } from "../browser";
import { HELPER_ORIGIN, type Definition } from "../control/definition";
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

/**
 * Who opens the windows: the local development server's route, the Mac helper
 * for a page served anywhere else, or this browser itself. Route and helper
 * run the same control and open the same native windows.
 */
export type Transport = "route" | "helper" | "browser";

const initial: ControlStatus<never> = { enabled: false, running: false, message: "Connecting…", open: 0, progress: 0, total: 0 };
const POLL_MS = 400;
/** How often a page on browser windows looks for a helper started since. */
const REPROBE_MS = 5000;

const onMac = () => /Mac/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent);

async function probe(url: string, signal: AbortSignal) {
  try {
    const timeout = AbortSignal.any([signal, AbortSignal.timeout(1500)]);
    const response = await fetch(url, { cache: "no-store", signal: timeout });
    const next = await response.json();
    return response.ok && next.enabled ? next : null;
  } catch {
    return null;
  }
}

function browserMessage<Settings>(status: ControlStatus<Settings>) {
  if (status.running || status.message !== "Browser windows") return status;
  return { ...status, message: onMac() ? "Browser windows · for app windows, start the Mac helper (pnpm desktop-collage:helper)" : "Browser windows" };
}

/**
 * Finds a transport, polls it, and measures the desktop on load and whenever
 * this page regains focus; every run measures it again.
 */
export function useControl<Settings>(path: string, definition: Definition<Settings & { clearFirst: boolean }>) {
  const [status, setStatus] = useState<ControlStatus<Settings>>(initial);
  const [transport, setTransport] = useState<Transport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const current = useRef<Transport | null>(null);

  const select = useCallback((next: Transport | null) => {
    current.current = next;
    setTransport(next);
  }, []);

  const send = useCallback(async (action: "measure" | "start" | "stop" | "clear", settings?: Settings) => {
    const via = current.current;
    if (!via) return;
    setError("");
    if (via === "browser") {
      // Synchronous, so the first window opens within the click.
      try {
        if (action === "start") startBrowser(definition, settings);
        else if (action === "stop") stopBrowser();
        else if (action === "clear") clearBrowser();
        else measureBrowser();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not run.");
      }
      setStatus(browserMessage(browserStatus() as ControlStatus<Settings>));
      return;
    }
    if (inFlight.current && action !== "stop") return;
    inFlight.current = true;
    if (action !== "measure") setBusy(true);
    try {
      const response = await fetch(via === "helper" ? `${HELPER_ORIGIN}${path}` : path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, settings }) });
      const next = await response.json();
      if (!response.ok && response.status !== 409) throw new Error(next.message || "Could not run.");
      setStatus(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not run.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [definition, path]);

  // Choose a transport, then poll it; fall back when it disappears.
  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let lastProbe = 0;
    const choose = async () => {
      const route = await probe(path, abort.signal);
      if (route) { select("route"); setStatus(route); return; }
      const helper = onMac() ? await probe(`${HELPER_ORIGIN}${path}`, abort.signal) : null;
      if (helper) { select("helper"); setStatus(helper); return; }
      select("browser");
      lastProbe = Date.now();
      setStatus(browserMessage(browserStatus() as ControlStatus<Settings>));
    };
    async function poll() {
      try {
        const via = current.current;
        if (!via) await choose();
        else if (via === "browser") {
          const local = browserStatus();
          setStatus(browserMessage(local as ControlStatus<Settings>));
          if (!local.running && !local.moving && onMac() && Date.now() - lastProbe > REPROBE_MS) {
            lastProbe = Date.now();
            const helper = await probe(`${HELPER_ORIGIN}${path}`, abort.signal);
            if (helper) { select("helper"); setStatus(helper); }
          }
        } else if (!inFlight.current) {
          const next = await probe(via === "helper" ? `${HELPER_ORIGIN}${path}` : path, abort.signal);
          if (!next) select(null);
          else if (!inFlight.current) setStatus(next);
        }
      } finally {
        if (!abort.signal.aborted) timer = setTimeout(poll, POLL_MS);
      }
    }
    void poll();
    const unsubscribe = subscribeBrowser(() => { if (current.current === "browser") setStatus(browserMessage(browserStatus() as ControlStatus<Settings>)); });
    return () => { abort.abort(); clearTimeout(timer); unsubscribe(); };
  }, [path, select]);

  // Measure once a transport is known, and again whenever this page regains focus.
  useEffect(() => {
    if (!transport) return;
    const remeasure = () => void send("measure");
    remeasure();
    window.addEventListener("focus", remeasure);
    return () => window.removeEventListener("focus", remeasure);
  }, [transport, send]);

  return { status, busy, error, send, transport };
}
