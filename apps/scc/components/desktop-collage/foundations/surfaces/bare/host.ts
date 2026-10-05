// Borderless windows owned by one JXA host process: no title bar, no toolbar,
// no application chrome — only the rectangle. Content is a flat colour or a
// WebKit view (the engine Safari uses) showing a page.
//
// The host stays alive to keep its windows on screen; killing the process
// removes them. It reports `progress` per window and `ready` once all are open
// on stderr, one JSON line each.

/** Item colours are sRGB 0–1; `rank` 1 = frontmost among this host's windows. */
export type BareItem = { x: number; y: number; width: number; height: number; rank: number; color: [number, number, number]; url?: string };
export type BareJob = { marker: string; items: BareItem[]; intervalMs: number; shadow: boolean; screenHeight: number; lifetimeMs: number };

/** Appears in every host's arguments so stray hosts can be found and removed. */
export const BARE_MARKER = 'scc-desktop-collage-bare-host';

export const bareHostScript = `
ObjC.import('Cocoa');
ObjC.import('WebKit');
function run(argv) {
  const job = JSON.parse(argv[0]);
  const app = $.NSApplication.sharedApplication;
  app.setActivationPolicy(1); // accessory: no Dock icon, no menu bar
  const spin = seconds => $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(seconds));
  const ours = []; // front to back
  const origin = Date.now();
  job.items.forEach((item, index) => {
    const due = origin + index * job.intervalMs - Date.now();
    if (index > 0 && due > 0) spin(due / 1000);
    const at = Date.now() - origin;
    // Cocoa places windows from the bottom-left of the primary screen.
    const rect = $.NSMakeRect(item.x, job.screenHeight - item.y - item.height, item.width, item.height);
    const win = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(rect, 0, 2, false);
    win.releasedWhenClosed = false;
    win.hasShadow = job.shadow;
    win.movableByWindowBackground = true;
    win.backgroundColor = $.NSColor.colorWithSRGBRedGreenBlueAlpha(item.color[0], item.color[1], item.color[2], 1);
    if (item.url) {
      const view = $.WKWebView.alloc.initWithFrameConfiguration($.NSMakeRect(0, 0, item.width, item.height), $.WKWebViewConfiguration.alloc.init);
      view.loadRequest($.NSURLRequest.requestWithURL($.NSURL.URLWithString(item.url)));
      win.contentView = view;
    }
    const rank = Math.min(item.rank, ours.length + 1);
    if (rank === 1) win.orderFrontRegardless;
    else win.orderWindowRelativeTo(-1, ours[rank - 2].windowNumber);
    ours.splice(rank - 1, 0, win);
    console.log('progress ' + JSON.stringify({ index, at }));
  });
  console.log('ready ' + JSON.stringify({ spreadMs: Date.now() - origin, windows: ours.length }));
  const end = Date.now() + job.lifetimeMs;
  while (Date.now() < end) spin(0.25);
}`;

/** `#rrggbb` → the host's sRGB 0–1 triple. */
export const bareColor = (hex: string): [number, number, number] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
