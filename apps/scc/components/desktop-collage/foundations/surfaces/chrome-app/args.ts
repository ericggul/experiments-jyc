// Launch arguments for the dedicated Chrome app instance.

export const CHROME_APP = '/Applications/Google Chrome.app';
export const chromeAppProfile = () => `/private/tmp/scc-desktop-collage-chrome-${process.getuid?.() ?? 0}`;

export type ChromeAppWindow = { x: number; y: number; width: number; height: number; url: string; at?: number };

export function chromeAppArgs(window: ChromeAppWindow, sound = false) {
  return [
    `--user-data-dir=${chromeAppProfile()}`,
    '--no-first-run',
    '--no-default-browser-check',
    // Port 0: Chrome picks a free local port and writes it to DevToolsActivePort.
    '--remote-debugging-port=0',
    // Window pages are served by the local development server, whose
    // certificate this throwaway profile does not trust. `--test-type` hides
    // the warning bar Chrome shows for that flag.
    '--ignore-certificate-errors',
    '--test-type',
    // Windows overlap by design: a covered window must keep animating and
    // talking to the others instead of being throttled as hidden.
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    // No translate bubble over foreign-language pages (seen over Naver, 2026-10-10).
    '--disable-features=Translate',
    // With sound, pages may start video by themselves; without it the whole
    // instance is muted. Instance flags take effect on the first launch only.
    ...(sound ? ['--autoplay-policy=no-user-gesture-required'] : ['--mute-audio']),
    `--app=${window.url}`,
    `--window-position=${Math.round(window.x)},${Math.round(window.y)}`,
    `--window-size=${Math.round(window.width)},${Math.round(window.height)}`,
  ];
}
