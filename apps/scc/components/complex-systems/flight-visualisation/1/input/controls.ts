/**
 * Input::getInput for the browser. viz1090's gestures: drag pans, one tap selects the
 * nearest aircraft, a second tap zooms in 4× on that point, the wheel and pinch zoom
 * about the centre, and − / = zoom from the keyboard. Arrow keys pan and Escape
 * clears the selection so the field stays usable without a pointer.
 */

export type ControlHandlers = {
  pan(dx: number, dy: number): void;
  zoomBy(factor: number): void;
  tap(x: number, y: number, count: number): void;
  deselect(): void;
};

const TAP_MS = 300;
const DOUBLE_TAP_MS = 350;
const TAP_SLOP = 6;
const DOUBLE_TAP_DISTANCE = 30;

export function attachControls(element: HTMLElement, handlers: ControlHandlers) {
  const pointers = new Map<number, { x: number; y: number }>();
  let down: { x: number; y: number; time: number; moved: boolean } | null = null;
  let lastTap = { x: 0, y: 0, time: -Infinity, count: 0 };
  let pinchDistance = 0;

  const local = (event: PointerEvent | WheelEvent) => {
    const rect = element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const pinchState = () => {
    const [a, b] = [...pointers.values()];
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  let pinchCentre = { x: 0, y: 0 };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Capture is a convenience for drags leaving the canvas; taps work without it.
    }
    element.focus({ preventScroll: true });
    const position = local(event);
    pointers.set(event.pointerId, position);
    if (pointers.size === 1) {
      down = { ...position, time: performance.now(), moved: false };
    } else if (pointers.size === 2) {
      const pinch = pinchState();
      pinchDistance = pinch.distance;
      pinchCentre = { x: pinch.x, y: pinch.y };
      if (down) down.moved = true;
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const position = local(event);
    pointers.set(event.pointerId, position);

    if (pointers.size >= 2) {
      const pinch = pinchState();
      if (pinchDistance > 0 && pinch.distance > 0) handlers.zoomBy(pinchDistance / pinch.distance);
      handlers.pan(pinch.x - pinchCentre.x, pinch.y - pinchCentre.y);
      pinchDistance = pinch.distance;
      pinchCentre = { x: pinch.x, y: pinch.y };
      return;
    }

    if (down && !down.moved && Math.hypot(position.x - down.x, position.y - down.y) > TAP_SLOP) {
      down.moved = true;
      element.dataset.dragging = "true";
    }
    if (down?.moved) handlers.pan(position.x - previous.x, position.y - previous.y);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size === 1) {
      const [remaining] = [...pointers.values()];
      down = { ...remaining, time: -Infinity, moved: true };
      return;
    }
    if (pointers.size > 0) return;

    delete element.dataset.dragging;
    const start = down;
    down = null;
    if (!start || start.moved || event.type === "pointercancel") return;
    const now = performance.now();
    if (now - start.time > TAP_MS) return;

    const position = local(event);
    const count =
      now - lastTap.time < DOUBLE_TAP_MS &&
      Math.hypot(position.x - lastTap.x, position.y - lastTap.y) < DOUBLE_TAP_DISTANCE
        ? lastTap.count + 1
        : 1;
    lastTap = { ...position, time: now, count };
    handlers.tap(position.x, position.y, count);
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
      handlers.zoomBy(Math.exp(Math.max(-60, Math.min(60, event.deltaY)) * 0.004));
    } else {
      if (event.deltaY) handlers.zoomBy(event.deltaY > 0 ? 1.5 : 1 / 1.5);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = 0.1 * Math.min(element.clientWidth, element.clientHeight);
    switch (event.key) {
      case "-":
      case "_":
        handlers.zoomBy(1.5);
        break;
      case "=":
      case "+":
        handlers.zoomBy(1 / 1.5);
        break;
      case "ArrowLeft":
        handlers.pan(step, 0);
        break;
      case "ArrowRight":
        handlers.pan(-step, 0);
        break;
      case "ArrowUp":
        handlers.pan(0, step);
        break;
      case "ArrowDown":
        handlers.pan(0, -step);
        break;
      case "Escape":
        handlers.deselect();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onPointerUp);
  element.addEventListener("wheel", onWheel, { passive: false });
  element.addEventListener("keydown", onKeyDown);

  return () => {
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", onPointerUp);
    element.removeEventListener("pointercancel", onPointerUp);
    element.removeEventListener("wheel", onWheel);
    element.removeEventListener("keydown", onKeyDown);
  };
}
