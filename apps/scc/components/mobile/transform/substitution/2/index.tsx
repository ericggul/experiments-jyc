"use client";

import { useState } from "react";
import CommandRenderer from "./renderer";
import { commandGroups, presentations, type CommandSetting } from "./setting";
import "./substitution.css";

export default function SubstitutionCommand({ clone }: { clone: string }) {
  const [open, setOpen] = useState(false);
  const [setting, setSetting] = useState<CommandSetting>({ presentation: "replace", group: "discipline" });
  const { presentation, group } = setting;
  const selected = presentation === "original" ? "원본" : `${presentations.find((item) => item.id === presentation)?.label} · ${commandGroups.find((item) => item.id === group)?.label}`;

  return (
    <>
      {presentation !== "original" && <CommandRenderer clone={clone} group={group} presentation={presentation} />}
      <div data-substitution-command-ui className="substitution-command-control">
        {open && (
          <div className="substitution-command-panel" role="group" aria-label="치환 필터 설정">
            <div className="substitution-command-panel-section" role="group" aria-label="표시 방식">
              <span className="substitution-command-panel-title">표시 방식</span>
              <button type="button" aria-pressed={presentation === "original"} onClick={() => setSetting({ ...setting, presentation: "original" })}>원본</button>
              {presentations.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={presentation === id} onClick={() => setSetting({ ...setting, presentation: id })}>{label}</button>
              ))}
            </div>
            <div className="substitution-command-panel-section" role="group" aria-label="명령 그룹">
              <span className="substitution-command-panel-title">명령 그룹</span>
              {commandGroups.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={presentation !== "original" && group === id} onClick={() => setSetting({ presentation: presentation === "original" ? "replace" : presentation, group: id })}>{label}</button>
              ))}
            </div>
          </div>
        )}
        <button type="button" className="substitution-command-trigger" aria-label={`필터 · ${selected}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          필터
        </button>
      </div>
    </>
  );
}
