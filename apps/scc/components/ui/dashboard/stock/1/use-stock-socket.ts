"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  OutgoingStockOrientation,
  StockOrientationSignal,
  StockPresence,
  StockRole,
} from "./types";

const events = {
  hello: "stock:hello",
  join: "stock:join",
  orientationIn: "stock:orientation:in",
  orientationOut: "stock:orientation:out",
  presence: "stock:presence",
} as const;

function getSocketOrigin() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    const port = process.env.NEXT_PUBLIC_SOCKET_PORT || "4000";
    return `${protocol}://${window.location.hostname}:${port}`;
  }

  return `https://localhost:${process.env.NEXT_PUBLIC_SOCKET_PORT || "4000"}`;
}

export function useStockSocket({
  onOrientation,
  role,
}: {
  onOrientation?: (signal: StockOrientationSignal) => void;
  role: StockRole;
}) {
  const socketRef = useRef<Socket | null>(null);
  const onOrientationRef = useRef(onOrientation);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastOrientation, setLastOrientation] =
    useState<StockOrientationSignal | null>(null);
  const [presence, setPresence] = useState<StockPresence | null>(null);

  useEffect(() => {
    onOrientationRef.current = onOrientation;
  }, [onOrientation]);

  useEffect(() => {
    const socket = io(getSocketOrigin(), {
      path: "/socket.io",
      reconnection: true,
      reconnectionDelay: 300,
      reconnectionDelayMax: 1500,
      rejectUnauthorized: false,
      timeout: 6000,
      transports: ["polling", "websocket"],
      tryAllTransports: true,
      upgrade: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setConnectionError(null);
      socket.emit(events.join, { experimentSlug: "1", role });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (error) => {
      setConnectionError(error.message || "socket connection failed");
    });
    socket.on(events.hello, ({
      lastOrientation: incomingOrientation,
      presence: incomingPresence,
    }: {
      lastOrientation: StockOrientationSignal | null;
      presence: StockPresence;
    }) => {
      setPresence(incomingPresence);
      if (incomingOrientation) {
        setLastOrientation(incomingOrientation);
        onOrientationRef.current?.(incomingOrientation);
      }
    });
    socket.on(events.presence, setPresence);
    socket.on(events.orientationOut, (signal: StockOrientationSignal) => {
      setLastOrientation(signal);
      onOrientationRef.current?.(signal);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [role]);

  const sendOrientation = useCallback((orientation: OutgoingStockOrientation) => {
    socketRef.current?.emit(events.orientationIn, orientation);
  }, []);

  return useMemo(
    () => ({
      connected,
      connectionError,
      lastOrientation,
      presence,
      sendOrientation,
    }),
    [connected, connectionError, lastOrientation, presence, sendOrientation],
  );
}
