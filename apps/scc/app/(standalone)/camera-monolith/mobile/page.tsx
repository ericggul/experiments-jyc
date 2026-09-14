import type { Metadata } from "next";
import { CameraMonolithMobile } from "@/components/standalone/camera-monolith";

export const metadata: Metadata = { title: "camera monolith mobile" };

export default function CameraMonolithMobilePage() {
  return <CameraMonolithMobile />;
}
