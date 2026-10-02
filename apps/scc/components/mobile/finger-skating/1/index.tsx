"use client";

import { useState } from "react";
import FingerSkatingOpt1 from "./opt1";
import FingerSkatingOpt2 from "./opt2";
import FingerSkatingOpt3 from "./opt3";
import styles from "./screen.module.css";

type Option = 1 | 2 | 3;

export default function MobileFingerSkatingOne() {
  const [option, setOption] = useState<Option>(2);
  const [open, setOpen] = useState(false);

  return (
    <>
      <FingerSkatingOpt1 active={option === 1} />
      <FingerSkatingOpt2 active={option === 2} />
      <FingerSkatingOpt3 active={option === 3} />
      <div className={styles.control}>
        {open && (
          <div className={styles.panel} role="group" aria-label="Finger skating options">
            {([1, 2, 3] as const).map((value) => (
              <button key={value} type="button" aria-pressed={option === value} onClick={() => setOption(value)}>
                opt {value}
              </button>
            ))}
          </div>
        )}
        <button type="button" className={styles.trigger} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          옵션 · opt {option}
        </button>
      </div>
    </>
  );
}
