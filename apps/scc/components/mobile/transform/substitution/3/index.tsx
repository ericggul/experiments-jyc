"use client";

import { useState } from "react";
import { BORDER_MAX, fonts, type Look } from "./cell-image";
import PixelRenderer from "./renderer";
import { commandGroups, type CommandGroup } from "./semantic";
import "./substitution.css";

const LOOK_DEFAULTS: Look = { font: "grotesque", border: 1, dark: false };
const GROUP_DEFAULT: CommandGroup = "discipline";

/** substitution/3: every part of the interface replaced in place, at its exact box, by a command word that fills it. */
export default function SubstitutionPixel({ clone }: { clone: string }) {
  const [open, setOpen] = useState(false);
  const [replaced, setReplaced] = useState(true);
  const [group, setGroup] = useState<CommandGroup>(GROUP_DEFAULT);
  const [look, setLook] = useState<Look>(LOOK_DEFAULTS);
  const update = (next: Partial<Look>) => setLook((current) => ({ ...current, ...next }));

  return (
    <>
      {replaced && <PixelRenderer clone={clone} group={group} look={look} />}
      <div data-substitution-pixel-ui="" className="substitution-pixel-control">
        {open && (
          <div id="substitution-pixel-options" className="substitution-pixel-panel" role="group" aria-label="치환">
            <p className="substitution-pixel-heading">치환</p>

            <p className="substitution-pixel-note">화면</p>
            <div className="substitution-pixel-chips" role="group" aria-label="화면">
              <button type="button" aria-pressed={!replaced} onClick={() => setReplaced(false)}>원본</button>
              <button type="button" aria-pressed={replaced} onClick={() => setReplaced(true)}>치환</button>
            </div>

            <p className="substitution-pixel-note">명령어</p>
            <div className="substitution-pixel-chips" role="group" aria-label="명령어">
              {commandGroups.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={group === id} onClick={() => setGroup(id)}>{label}</button>
              ))}
            </div>

            <p className="substitution-pixel-note">글꼴</p>
            <div className="substitution-pixel-chips" role="group" aria-label="글꼴">
              {fonts.map(({ id, label, name, family, weight }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={look.font === id}
                  aria-label={label}
                  style={{ fontFamily: family, fontWeight: weight }}
                  onClick={() => update({ font: id })}
                >
                  {/* Each face is named in itself, so the choice is seen as well as read. */}
                  {name}
                </button>
              ))}
            </div>

            <p className="substitution-pixel-note">바탕</p>
            <div className="substitution-pixel-chips" role="group" aria-label="바탕">
              <button type="button" aria-pressed={!look.dark} onClick={() => update({ dark: false })}>흰 바탕</button>
              <button type="button" aria-pressed={look.dark} onClick={() => update({ dark: true })}>검은 바탕</button>
            </div>

            <label className="substitution-pixel-slider">
              <span>
                테두리 <output>{look.border === 0 ? "없음" : `${look.border.toFixed(1)} px`}</output>
              </span>
              <input
                type="range"
                min="0"
                max={BORDER_MAX}
                step="0.05"
                value={look.border}
                aria-label="테두리 굵기: 0이면 없음, 1이면 가는 선, 오른쪽으로 갈수록 굵게"
                onChange={(event) => update({ border: Number(event.target.value) })}
              />
            </label>

            <button
              type="button"
              className="substitution-pixel-reset"
              onClick={() => {
                setLook(LOOK_DEFAULTS);
                setGroup(GROUP_DEFAULT);
                setReplaced(true);
              }}
            >
              기본값으로
            </button>
          </div>
        )}
        <button
          type="button"
          className="substitution-pixel-trigger"
          aria-label="치환 옵션"
          aria-expanded={open}
          aria-controls="substitution-pixel-options"
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <rect x="2.5" y="3.5" width="15" height="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <rect x="2.5" y="11.5" width="9" height="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <rect x="13.5" y="11.5" width="4" height="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </div>
    </>
  );
}
