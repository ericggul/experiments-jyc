import Link from "next/link";
import { speculativeExhibitions } from "./data";

const headers = ["Name", "Artists", "Type", "Period", "Admission fee"];

export default function MomaTwo() {
  return (
    <main className="h-dvh overflow-hidden bg-white text-black">
      <div className="grid h-full grid-rows-[auto_1fr]">
        <nav className="grid grid-cols-[auto_1fr] items-center border-b border-black">
          <Link
            target="_blank"
            rel="noopener noreferrer"
            href="/moma"
            className="border-r border-black px-3 py-2 text-[clamp(28px,5vw,56px)] font-black leading-none tracking-[-0.08em]"
          >
            MoMA
          </Link>
          <div className="flex justify-end gap-4 px-3 text-sm font-bold">
            <Link target="_blank" rel="noopener noreferrer" href="/moma/1">1</Link>
            <Link target="_blank" rel="noopener noreferrer" href="/moma/2">2</Link>
          </div>
        </nav>

        <table className="h-full w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-black">
              {headers.map((header) => (
                <th
                  key={header}
                  className="border-r border-black px-[clamp(4px,0.8vw,10px)] py-[clamp(4px,0.8vh,8px)] text-[clamp(9px,1vw,13px)] font-black uppercase leading-none last:border-r-0"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {speculativeExhibitions.map((item) => (
              <tr key={item.name} className="border-b border-black last:border-b-0">
                <td className="border-r border-black px-[clamp(4px,0.8vw,10px)] py-[clamp(4px,0.9vh,9px)] text-[clamp(13px,1.7vw,24px)] font-black leading-[0.95] tracking-[-0.04em]">
                  {item.name}
                </td>
                <td className="border-r border-black px-[clamp(4px,0.8vw,10px)] py-[clamp(4px,0.9vh,9px)] text-[clamp(10px,1.1vw,15px)] font-semibold leading-tight">
                  {item.artists}
                </td>
                <td className="border-r border-black px-[clamp(4px,0.8vw,10px)] py-[clamp(4px,0.9vh,9px)] text-[clamp(10px,1.1vw,15px)] font-semibold leading-tight">
                  {item.type}
                </td>
                <td className="border-r border-black px-[clamp(4px,0.8vw,10px)] py-[clamp(4px,0.9vh,9px)] text-[clamp(10px,1.1vw,15px)] font-black leading-tight">
                  {item.period}
                </td>
                <td className="px-[clamp(4px,0.8vw,10px)] py-[clamp(4px,0.9vh,9px)] text-[clamp(10px,1.1vw,15px)] font-black leading-tight">
                  {item.admissionFee}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
