import Link from "next/link";
import { aerodynamicsExperiments } from "@/components/standalone/aerodynamics/experiments";
export const metadata = { title: "Aerodynamics" };
export default function Page() {
  return <main className="min-h-screen bg-[#f5f5f2] p-8 text-[#202626]"><h1 className="mb-10 text-5xl tracking-tight">Aerodynamics</h1><nav>{aerodynamicsExperiments.map(({ slug, label }) => <Link target="_blank" rel="noopener noreferrer" className="text-2xl" key={slug} href={`/aerodynamics/${slug}`}>{label}</Link>)}</nav></main>;
}
