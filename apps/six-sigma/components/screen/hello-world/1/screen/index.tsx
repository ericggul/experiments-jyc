"use client";

import { useHelloWorldSocket } from "../transport/use-hello-world-socket";
import styles from "./screen.module.css";

export default function HelloWorldScreen() {
  const connected = useHelloWorldSocket();

  return (
    <main className={styles.screen}>
      <h1>Hello world</h1>
      <p>{connected ? "Relay connected" : "Connecting to relay…"}</p>
    </main>
  );
}
