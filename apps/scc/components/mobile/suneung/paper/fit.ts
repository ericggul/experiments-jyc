// Pins every word to the x where it is printed. A line's runs (one word and
// its trailing space each) tile it: each run is given exactly its printed
// advance, and the glyphs inside are spread by letter-spacing as HWP spreads
// them, or stretched by 장평 for display faces whose substitutes differ in width.

/** Original box and underline distances from the baseline, in em. */
const BOX_TOP = 0.975;
const BOX_HEIGHT = 1.2;
const UNDERLINE_TOP = 0.2;

export function fitLines(root: HTMLElement) {
  const lines = Array.from(root.querySelectorAll<HTMLElement>("[data-line]")).map((line) => {
    const glyphs = line.firstElementChild as HTMLElement;
    const baseline = glyphs.firstElementChild as HTMLElement;
    return { line, scale: Number(line.dataset.scale), base: baseline.offsetTop };
  });
  for (const { line, base } of lines) {
    line.style.translate = `0 ${-base}px`;
    line.dataset.base = String(base);
  }

  // Glyphs fill their printed ink width; the trailing space takes what is left of
  // the run's advance, since the substitute's space differs most from HWP's.
  const runs = Array.from(root.querySelectorAll<HTMLElement>("[data-line] [data-n]")).map((run) => {
    const line = run.closest<HTMLElement>("[data-line]")!;
    const text = run.textContent ?? "";
    const glyphs = Array.from(text.trimEnd());
    const box = run.getBoundingClientRect();
    const range = document.createRange();
    range.setStart(run.firstChild!, 0);
    range.setEnd(run.firstChild!, text.trimEnd().length);
    const natural = run.offsetWidth;
    const ink = box.width > 0 ? (range.getBoundingClientRect().width / box.width) * natural : natural;
    return { run, natural, ink, glyphs: glyphs.length, scale: Number(line.dataset.scale) };
  });
  for (const { run, natural, ink, glyphs, scale } of runs) {
    const target = Number(run.dataset.w) / scale;
    if (run.dataset.fit === "scale") {
      run.style.transform = `scaleX(${target / natural})`;
      run.style.width = `${natural}px`;
      run.style.marginRight = `${target - natural}px`;
      continue;
    }
    const spacing = glyphs > 1 ? (Number(run.dataset.e) / scale - ink) / (glyphs - 1) : 0;
    run.style.width = `${target}px`;
    run.style.letterSpacing = `${spacing}px`;
    run.style.setProperty("--ls", `${spacing}px`);
  }

  const figureText = Array.from(root.querySelectorAll<HTMLElement>("[data-fit-width]")).map((text) => ({
    text,
    natural: text.offsetWidth,
    count: Array.from(text.textContent ?? "").length,
  }));
  for (const { text, natural, count } of figureText) {
    if (count > 1) text.style.letterSpacing = `${(Number(text.dataset.fitWidth) - natural) / (count - 1)}px`;
  }

  const marks = Array.from(root.querySelectorAll<HTMLElement>("[data-line] [data-m]")).map((run) => {
    const line = run.closest<HTMLElement>("[data-line]")!;
    return {
      run,
      top: run.offsetTop,
      base: Number(line.dataset.base),
      size: parseFloat(getComputedStyle(run).fontSize),
      ink: Number(run.dataset.e) / Number(line.dataset.scale),
    };
  });
  for (const { run, top, base, size, ink } of marks) {
    run.style.setProperty("--mark-width", `${ink}px`);
    if (run.dataset.m === "b") {
      run.style.setProperty("--mark-top", `${base - BOX_TOP * size - top}px`);
      run.style.setProperty("--mark-height", `${BOX_HEIGHT * size}px`);
    } else {
      run.style.setProperty("--mark-top", `${base - top}px`);
      run.style.setProperty("--mark-height", `${UNDERLINE_TOP * size}px`);
    }
  }
}
