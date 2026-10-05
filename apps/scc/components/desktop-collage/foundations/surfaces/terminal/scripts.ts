// JXA for Terminal windows.

/**
 * Opens one painted Terminal window per item on an absolute schedule (item i
 * at i × interval), so slow creation does not accumulate drift. Background,
 * text and cursor all take the item colour (JXA uses 0–1 RGB); only the
 * window's own title is cleared, never the user's profile. Each window then
 * takes its stacking rank among this run's windows (1 = front). If Terminal
 * was not running, the default window its launch opens is closed first.
 */
export const openTerminalScript = `
function run(argv) {
  const job = JSON.parse(argv[0]);
  const app = Application('Terminal');
  const wasRunning = app.running();
  app.activate();
  if (!wasRunning) {
    delay(0.6);
    app.windows().forEach(window => { try { window.close(); } catch (error) {} });
  }
  const origin = Date.now();
  const windows = [];
  job.items.forEach((item, index) => {
    const due = origin + index * job.intervalMs - Date.now();
    if (index > 0 && due > 0) delay(due / 1000);
    const at = Date.now() - origin;
    try {
      const tab = app.doScript('');
      const id = app.windows[0].id();
      for (const key of ['backgroundColor', 'normalTextColor', 'boldTextColor', 'cursorColor']) {
        try { tab[key] = item.color; } catch (error) {}
      }
      try { tab.customTitle = ' '; tab.titleDisplaysCustomTitle = true; } catch (error) {}
      const window = app.windows.byId(id);
      window.bounds = { x: item.x, y: item.y, width: item.width, height: item.height };
      if (item.rank > 1) window.index = item.rank;
      const bounds = window.bounds();
      windows.push({ index, id, at, bounds: [bounds.x, bounds.y, bounds.width, bounds.height] });
      console.log('progress ' + JSON.stringify({ index, at }));
    } catch (error) {
      windows.push({ index, at, error: String(error).slice(0, 200) });
    }
  });
  return JSON.stringify({ windows, spreadMs: Date.now() - origin });
}`;

/** Closes only the given window IDs; windows already closed are skipped. */
export const closeTerminalScript = `
function run(argv) {
  const job = JSON.parse(argv[0]);
  const app = Application('Terminal');
  let closed = 0;
  job.ids.forEach(id => {
    try { app.windows.byId(id).close(); closed++; } catch (error) {}
  });
  return JSON.stringify({ closed });
}`;
