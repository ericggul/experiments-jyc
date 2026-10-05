"use client";

import dynamic from "next/dynamic";

// The window reads its own screen position, so it never renders on the server.
const FieldWindow = dynamic(() => import("./index"), { ssr: false });

export default function FieldWindowClient() {
  return <FieldWindow />;
}
