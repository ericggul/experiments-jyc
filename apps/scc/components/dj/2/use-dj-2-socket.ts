"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export type DjTwoRole = "controller" | "screen";
export type TransportStatus = "stopped" | "paused" | "playing";

export type DjTwoTransport = {
  status: TransportStatus;
  position: number;
  startedAt: number | null;
  trackId: string | null;
  revision: number;
  serverTime: number;
};

export type DjTwoPresence = {
  experimentId: "dj";
  variantId: "2";
  total: number;
  controllers: number;
  screens: number;
  channels: string[];
  serverTime: number;
};

type DjTwoCommand = {
  action: "play" | "pause" | "restart";
  position?: number;
  trackId?: string;
};

const events = {
  join: "dj:2:join",
  hello: "dj:2:hello",
  presence: "dj:2:presence",
  clock: "dj:2:clock",
  channels: "dj:2:channels",
  command: "dj:2:command",
  state: "dj:2:state",
} as const;

const emptyChannels: readonly string[] = [];

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

export function useDjTwoSocket({
  role,
  channels = emptyChannels,
  enabled = true,
}: {
  role: DjTwoRole;
  channels?: readonly string[];
  enabled?: boolean;
}) {
  const socketRef = useRef<Socket | null>(null);
  const channelsRef = useRef(channels);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [presence, setPresence] = useState<DjTwoPresence | null>(null);
  const [transport, setTransport] = useState<DjTwoTransport | null>(null);
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
        experimentSlug: "2",
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
      ({
        presence: incomingPresence,
        transport: incomingTransport,
      }: {
        presence: DjTwoPresence;
        transport: DjTwoTransport;
      }) => {
        setPresence(incomingPresence);
        setTransport(incomingTransport);
      },
    );
    socket.on(events.presence, (incomingPresence: DjTwoPresence) => {
      setPresence(incomingPresence);
    });
    socket.on(events.state, (incomingTransport: DjTwoTransport) => {
      setTransport(incomingTransport);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, role]);

  const sendCommand = useCallback((command: DjTwoCommand) => {
    socketRef.current?.emit(events.command, command);
  }, []);

  return {
    connected,
    connectionError,
    presence,
    transport,
    clockOffsetMs,
    sendCommand,
  };
}
