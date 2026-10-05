// Self-contained pages for browser windows. A data URL needs no server, so no
// certificate warning, and loads as fast as the browser can paint it.

/** A flat-colour page; `theme-color` lets browsers that tint their chrome use it. */
export function colorPage(hex: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="theme-color" content="${hex}"><title>&#8203;</title><style>html,body{margin:0;height:100%;background:${hex}}</style></head><body></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}
