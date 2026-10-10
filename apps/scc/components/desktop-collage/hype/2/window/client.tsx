"use client";

import dynamic from "next/dynamic";

// The cloned page reads its parameters from its own URL, so it never renders on the server.
const HypeWindow = dynamic(() => import("./index"), { ssr: false });

export default function HypeWindowClient() {
  return <HypeWindow />;
}
