import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const events = {
  join: "six-sigma:0923:hello-world:join",
  hello: "six-sigma:0923:hello-world:hello",
};

function socketOrigin() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  return `https://${window.location.hostname}:${process.env.NEXT_PUBLIC_SOCKET_PORT || "4000"}`;
}

export function useHelloWorldSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(socketOrigin(), { transports: ["websocket"] });
    socket.on("connect", () => socket.emit(events.join));
    socket.on(events.hello, () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    return () => {
      socket.disconnect();
    };
  }, []);

  return connected;
}
