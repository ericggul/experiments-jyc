import * as rt from "__REACT__/jsx-runtime.js";
export const Fragment = rt.Fragment;
function check(type, props) {
  const children = props?.children;
  if (!Array.isArray(children)) return;
  // The children array itself, and any array nested in it (from .map()).
  for (const child of [children, ...children]) {
    if (!Array.isArray(child)) continue;
    const seen = new Set();
    for (const el of child) {
      if (!el || typeof el !== "object" || el.key == null) continue;
      if (seen.has(el.key)) globalThis.__dupes?.(typeof type === "string" ? type : type?.name ?? "?", el.key);
      seen.add(el.key);
    }
  }
}
export function jsx(type, props, key) { check(type, props); return rt.jsx(type, props, key); }
export function jsxs(type, props, key) { check(type, props); return rt.jsxs(type, props, key); }
