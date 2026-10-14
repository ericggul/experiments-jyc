/**
 * A hand for one phone on `/mobiles/2`: it scrolls the page in view, pages a swipe feed, and taps the kind of control a
 * reader taps (like, follow, a tab), each at the phone's own pace. It drives the clone only through the DOM, so the clone
 * runs unchanged, and it never touches a field, a composer, a share or a destructive control. Whatever it opens it tends
 * to close again, so every phone keeps moving through its app rather than resting in one sheet.
 */

/** Seconds-scale pace: the mean pause between two actions, drawn once per phone. */
export const PACE_RANGE = [1500, 4500] as const;

/** A control opening a sheet or page the pilot should leave again. */
const closing = /^(back|close|close comments|cancel|done|go back)$/i;
/** Controls a reader taps while browsing: reactions, follows and the app's own navigation. Not a video's own open control: the
 * home feeds already play what the field can afford, and a page per phone with another player would double that. */
const tapping = /^(like|unlike|dislike|save|bookmark|follow|subscribe|home|search|reels|shorts|profile|subscriptions|notifications|explore|for you|following|messages|inbox|library|you|videos|posts|replies|media|likes|activity|discover|friends|yt home|youtube home|threads|communities)$/i;
/** Never these: they write, send, leave the app, or change settings. */
const avoiding = /(create|post|upload|compose|new |send|share|reply|comment|remove|delete|sign|switch|settings|options|more|cast|voice|call|unfollow|unsubscribe|clear|report|block|mute|download|edit|log)/i;

const random = (min: number, max: number) => min + Math.random() * (max - min);

function labelOf(element: Element) {
  return (element.getAttribute("aria-label") || element.textContent || "").trim().replace(/\s+/g, " ");
}

function visibleIn(element: Element, frame: DOMRect) {
  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  return rect.bottom > frame.top && rect.top < frame.bottom && rect.right > frame.left && rect.left < frame.right;
}

/** The largest scroller in view with room to scroll: a feed, a profile, a comment list. */
function scrollerIn(root: HTMLElement, frame: DOMRect) {
  let best: { element: HTMLElement; area: number } | null = null;
  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    if (element.scrollHeight <= element.clientHeight + 4 || !visibleIn(element, frame)) continue;
    const overflow = getComputedStyle(element).overflowY;
    if (overflow !== "auto" && overflow !== "scroll") continue;
    const rect = element.getBoundingClientRect();
    const area = Math.min(rect.right, frame.right) - Math.max(rect.left, frame.left);
    const height = Math.min(rect.bottom, frame.bottom) - Math.max(rect.top, frame.top);
    if (!best || area * height > best.area) best = { element, area: area * height };
  }
  return best?.element ?? null;
}

function controlsIn(root: HTMLElement, frame: DOMRect) {
  const closers: HTMLElement[] = [];
  const taps: HTMLElement[] = [];
  for (const element of root.querySelectorAll<HTMLElement>("button, a, [role='button'], [role='tab']")) {
    if ((element as HTMLButtonElement).disabled || element.getAttribute("aria-hidden") === "true" || !visibleIn(element, frame)) continue;
    const label = labelOf(element);
    if (!label) continue;
    if (closing.test(label)) closers.push(element);
    else if ((tapping.test(label) || element.getAttribute("role") === "tab") && !avoiding.test(label)) taps.push(element);
  }
  return { closers, taps };
}

/** Starts the pilot on one phone element and returns the stop. Positions come from the phone's on-screen box, whatever its scale. */
export function startAutopilot(root: HTMLElement, pace = random(PACE_RANGE[0], PACE_RANGE[1])) {
  let timer = 0;
  let stopped = false;

  const act = () => {
    const frame = root.getBoundingClientRect();
    if (frame.width < 1) return;
    const { closers, taps } = controlsIn(root, frame);
    const roll = Math.random();

    // Something is open (a sheet, a detail page): most often, leave it.
    if (closers.length && roll < 0.55) {
      closers[Math.floor(Math.random() * closers.length)].click();
      return;
    }
    if (roll < 0.6) {
      const scroller = scrollerIn(root, frame);
      if (scroller) {
        const screen = scroller.clientHeight;
        const atEnd = scroller.scrollTop + screen >= scroller.scrollHeight - 8;
        const up = atEnd ? Math.random() < 0.5 : Math.random() < 0.15;
        if (atEnd && !up) scroller.scrollTo({ top: 0, behavior: "smooth" });
        else scroller.scrollBy({ top: (up ? -1 : 1) * screen * random(0.35, 1.1), behavior: "smooth" });
        return;
      }
      // No scroller in view: a paged feed (TikTok, Shorts) that moves on a wheel tick.
      const target = document.elementFromPoint(frame.left + frame.width / 2, frame.top + frame.height / 2);
      if (target && root.contains(target)) {
        const deltaY = (Math.random() < 0.12 ? -1 : 1) * 600;
        target.dispatchEvent(new WheelEvent("wheel", { deltaY, deltaMode: 0, bubbles: true, cancelable: true, clientX: frame.left + frame.width / 2, clientY: frame.top + frame.height / 2 }));
      }
      return;
    }
    if (roll < 0.85 && taps.length) {
      taps[Math.floor(Math.random() * taps.length)].click();
    }
    // Otherwise the reader just looks.
  };

  const next = () => {
    timer = window.setTimeout(() => {
      if (stopped) return;
      try {
        act();
      } catch {
        // A clone in mid-transition may refuse an action; the pilot tries again after its pause.
      }
      next();
    }, pace * random(0.5, 1.5));
  };
  next();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
  };
}
