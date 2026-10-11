"use client";

import { useState } from "react";
import FormRenderer, { type FormMode } from "./renderer";
import "./substitution.css";

type Mode = "original" | FormMode;
const modes: { id: Mode; label: string }[] = [
  { id: "original", label: "원본" },
  { id: "outline", label: "윤곽선" },
  { id: "color", label: "대표색" },
];

export default function SubstitutionForm() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("outline");
  const selected = modes.find((item) => item.id === mode)?.label;

  return (
    <>
      {mode !== "original" && <FormRenderer mode={mode} />}
      <div data-substitution-form-ui className="substitution-form-control">
        {open && (
          <div className="substitution-form-panel" role="group" aria-label="치환 필터 설정">
            {modes.map(({ id, label }) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>
            ))}
          </div>
        )}
        <button type="button" className="substitution-form-trigger" aria-label={`필터 · ${selected}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {`필터 · ${selected}`}
        </button>
      </div>
    </>
  );
}
