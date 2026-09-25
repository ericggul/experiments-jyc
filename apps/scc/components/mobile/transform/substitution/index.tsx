"use client";

import { useState } from "react";
import SubstitutionRenderer, { type Presentation } from "./renderer";
import { commandGroups, type CommandGroup } from "./semantic";
import "./substitution.css";

type Mode = "original" | "outline" | "color" | "semantic";
const presentations: { id: Presentation; label: string }[] = [
  { id: "replace", label: "완전 대체" },
  { id: "overlay", label: "오버레이" },
  { id: "reveal", label: "호버 / 손가락 리빌" },
];

export default function Substitution({ variant, clone }: { variant: 1 | 2; clone: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(variant === 1 ? "outline" : "semantic");
  const [group, setGroup] = useState<CommandGroup>("discipline");
  const [presentation, setPresentation] = useState<Presentation>("replace");
  const selected = variant === 1
    ? mode === "original" ? "원본" : mode === "color" ? "대표색" : "윤곽선"
    : mode === "original" ? "원본" : `${presentations.find((item) => item.id === presentation)?.label} · ${commandGroups.find((item) => item.id === group)?.label}`;

  const select = (nextMode: Mode, nextGroup?: CommandGroup) => {
    setMode(nextMode);
    if (nextGroup) setGroup(nextGroup);
  };

  return (
    <>
      {mode !== "original" && <SubstitutionRenderer mode={mode} clone={clone} group={group} presentation={presentation} />}
      <div data-substitution-ui data-substitution-variant={variant} className="substitution-control">
        {open && (
          <div className="substitution-panel" role="group" aria-label="치환 필터 설정">
            {variant === 1 ? (
              <>
                <button type="button" aria-pressed={mode === "original"} onClick={() => select("original")}>원본</button>
                <button type="button" aria-pressed={mode === "outline"} onClick={() => select("outline")}>윤곽선</button>
                <button type="button" aria-pressed={mode === "color"} onClick={() => select("color")}>대표색</button>
              </>
            ) : (
              <>
                <div className="substitution-panel-section" role="group" aria-label="표시 방식">
                  <span className="substitution-panel-title">표시 방식</span>
                  <button type="button" aria-pressed={mode === "original"} onClick={() => select("original")}>원본</button>
                  {presentations.map(({ id, label }) => (
                    <button key={id} type="button" aria-pressed={mode === "semantic" && presentation === id} onClick={() => { setMode("semantic"); setPresentation(id); }}>{label}</button>
                  ))}
                </div>
                <div className="substitution-panel-section" role="group" aria-label="명령 그룹">
                  <span className="substitution-panel-title">명령 그룹</span>
                  {commandGroups.map(({ id, label }) => (
                    <button key={id} type="button" aria-pressed={mode === "semantic" && group === id} onClick={() => select("semantic", id)}>{label}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <button type="button" className="substitution-trigger" aria-label={`필터 · ${selected}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {variant === 2 ? "필터" : `필터 · ${selected}`}
        </button>
      </div>
    </>
  );
}
