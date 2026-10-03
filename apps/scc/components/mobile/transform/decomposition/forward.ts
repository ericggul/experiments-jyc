/**
 * Makes copies operable: input on a copy inside `surface` is replayed on the
 * live element `resolve` maps it to. Clicks bubble from that element to the
 * control it belongs to; typing, select changes, Enter, and focus are replayed
 * so controlled inputs update. Returns a detach function.
 */
export function forwardInput(surface: HTMLElement, resolve: (target: Element) => Element | null) {
  const originalOf = (target: EventTarget | null) => (target instanceof Element ? resolve(target) : null);

  const onClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    let element = originalOf(event.target);
    while (element && !(element instanceof HTMLElement)) element = element.parentElement;
    if (element instanceof HTMLElement) element.click();
  };

  const onDoubleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const original = originalOf(event.target);
    if (!original || !(event.target instanceof Element)) return;
    const from = event.target.getBoundingClientRect();
    const to = original.getBoundingClientRect();
    original.dispatchEvent(new MouseEvent("dblclick", {
      bubbles: true, cancelable: true, view: window, detail: 2,
      clientX: to.left + (event.clientX - from.left) * (from.width ? to.width / from.width : 1),
      clientY: to.top + (event.clientY - from.top) * (from.height ? to.height / from.height : 1),
    }));
  };

  const onInput = (event: Event) => {
    const target = event.target;
    const original = originalOf(target);
    if (!original) return;
    if (target instanceof HTMLSelectElement && original instanceof HTMLSelectElement) {
      original.value = target.value;
      original.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    const typed = (target instanceof HTMLInputElement && !/^(checkbox|radio)$/.test(target.type)) || target instanceof HTMLTextAreaElement;
    if (!typed || !(original instanceof HTMLInputElement || original instanceof HTMLTextAreaElement)) return;
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(original), "value")?.set?.call(original, (target as HTMLInputElement).value);
    original.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
    const original = originalOf(event.target);
    if (!(original instanceof HTMLInputElement)) return;
    event.preventDefault();
    const forwarded = new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true });
    if (original.dispatchEvent(forwarded) && original.form) original.form.requestSubmit();
  };

  const onFocus = (event: FocusEvent) => {
    if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement)) return;
    originalOf(event.target)?.dispatchEvent(new FocusEvent(event.type, { bubbles: true }));
  };

  surface.addEventListener("click", onClick);
  surface.addEventListener("dblclick", onDoubleClick);
  surface.addEventListener("input", onInput);
  surface.addEventListener("keydown", onKeyDown);
  surface.addEventListener("focusin", onFocus);
  surface.addEventListener("focusout", onFocus);
  return () => {
    surface.removeEventListener("click", onClick);
    surface.removeEventListener("dblclick", onDoubleClick);
    surface.removeEventListener("input", onInput);
    surface.removeEventListener("keydown", onKeyDown);
    surface.removeEventListener("focusin", onFocus);
    surface.removeEventListener("focusout", onFocus);
  };
}
