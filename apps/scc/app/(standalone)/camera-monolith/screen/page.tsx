import type { Metadata } from "next";
import { CameraMonolithScreen } from "@/components/standalone/camera-monolith";

export const metadata: Metadata = { title: "camera monolith screen" };

export default function CameraMonolithScreenPage() {
  return <CameraMonolithScreen />;
}
