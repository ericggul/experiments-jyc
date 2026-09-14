"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  CAMERA_MONOLITH_VARIANT_ID,
  cameraMonolithEvents,
  type CameraMonolithPresence,
  type CameraMonolithRole,
} from "./protocol";

function getSocketOrigin() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;

  if (typeof window !== "undefined") {
    const origin = new URL(window.location.origin);
    origin.port = process.env.NEXT_PUBLIC_SOCKET_PORT || "4000";
    return origin.origin;
  }

  return `https://${process.env.NEXT_PUBLIC_DEV_HOSTNAME || "localhost"}:${process.env.NEXT_PUBLIC_SOCKET_PORT || "4000"}`;
}

export function useCameraMonolithSocket(role: CameraMonolithRole) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [presence, setPresence] = useState<CameraMonolithPresence | null>(null);

  useEffect(() => {
    const nextSocket = io(getSocketOrigin(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      upgrade: true,
      reconnection: true,
      reconnectionDelay: 300,
      reconnectionDelayMax: 1600,
      timeout: 6000,
    });

    nextSocket.on("connect", () => {
      setSocket(nextSocket);
      setConnected(true);
      setConnectionError(null);
      nextSocket.emit(cameraMonolithEvents.join, {
        role,
        experimentSlug: CAMERA_MONOLITH_VARIANT_ID,
      });
    });
    nextSocket.on("disconnect", () => setConnected(false));
    nextSocket.on("connect_error", (error) => {
      setConnectionError(error.message || "socket connection failed");
    });
    nextSocket.on(
      cameraMonolithEvents.hello,
      ({ presence: nextPresence }: { presence: CameraMonolithPresence }) => {
        setPresence(nextPresence);
      },
    );
    nextSocket.on(cameraMonolithEvents.presence, setPresence);

    return () => {
      nextSocket.disconnect();
    };
  }, [role]);

  return { socket, connected, connectionError, presence };
}
