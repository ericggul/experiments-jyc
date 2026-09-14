"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export type TransportStatus = "stopped" | "paused" | "playing";

export type DjThreeTransport = {
  status: TransportStatus;
  position: number;
  startedAt: number | null;
  trackId: string | null;
  revision: number;
  serverTime: number;
};

type Role = "controller" | "screen";
type Command = {
  action: "play" | "pause" | "restart";
  position?: number;
  trackId?: string;
};

const events = {
  join: "dj:3:join",
  hello: "dj:3:hello",
  clock: "dj:3:clock",
  channels: "dj:3:channels",
  command: "dj:3:command",
  state: "dj:3:state",
} as const;

const emptyChannels: readonly string[] = [];

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

async function measureClockOffset(socket: Socket) {
  const samples: Array<{ offset: number; roundTrip: number }> = [];

  for (let index = 0; index < 5; index += 1) {
    const sentAt = Date.now();
    const serverTime = await new Promise<number | null>((resolve) => {
      socket.timeout(1000).emit(
        events.clock,
        (error: Error | null, incomingServerTime: number) => {
          resolve(error ? null : incomingServerTime);
        },
      );
    });
    const receivedAt = Date.now();
    if (serverTime === null) continue;
    const roundTrip = receivedAt - sentAt;
    samples.push({
      roundTrip,
      offset: serverTime - (sentAt + roundTrip / 2),
    });
  }

  samples.sort((left, right) => left.roundTrip - right.roundTrip);
  return samples[0]?.offset ?? 0;
}

export function useDjThreeSocket({
  role,
  channels = emptyChannels,
  enabled = true,
}: {
  role: Role;
  channels?: readonly string[];
  enabled?: boolean;
}) {
  const socketRef = useRef<Socket | null>(null);
  const channelsRef = useRef(channels);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [transport, setTransport] = useState<DjThreeTransport | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);

  useEffect(() => {
    channelsRef.current = channels;
    socketRef.current?.emit(events.channels, channels);
  }, [channels]);

  useEffect(() => {
    if (!enabled) return;

    const socket = io(getSocketOrigin(), {
      path: "/socket.io",
      rejectUnauthorized: false,
      transports: ["polling", "websocket"],
      upgrade: true,
      tryAllTransports: true,
      reconnection: true,
      reconnectionDelay: 300,
      reconnectionDelayMax: 1500,
      timeout: 6000,
    });
    socketRef.current = socket;

    socket.on("connect", async () => {
      setConnected(false);
      setConnectionError(null);
      socket.emit(events.join, {
        role,
        channels: channelsRef.current,
        experimentSlug: "3",
      });
      const offset = await measureClockOffset(socket);
      if (!socket.connected) return;
      setClockOffsetMs(offset);
      setConnected(true);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (error) => {
      setConnectionError(error.message || "socket connection failed");
    });
    socket.on(
      events.hello,
      ({ transport: incomingTransport }: { transport: DjThreeTransport }) => {
        setTransport(incomingTransport);
      },
    );
    socket.on(events.state, (incomingTransport: DjThreeTransport) => {
      setTransport(incomingTransport);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, role]);

  const sendCommand = useCallback((command: Command) => {
    socketRef.current?.emit(events.command, command);
  }, []);

  return {
    connected,
    connectionError,
    transport,
    clockOffsetMs,
    sendCommand,
  };
}
