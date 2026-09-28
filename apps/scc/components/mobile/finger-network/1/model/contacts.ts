export type Contact = { x: number; y: number };
export type ContactChange = Contact & { identifier: number };
export type ContactEvent = "touchstart" | "touchmove" | "touchend" | "touchcancel";

export function applyContactChanges(
  contacts: Map<number, Contact>,
  type: ContactEvent,
  changes: readonly ContactChange[],
) {
  if (type === "touchend" || type === "touchcancel") {
    for (const change of changes) contacts.delete(change.identifier);
  } else {
    for (const change of changes) contacts.set(change.identifier, { x: change.x, y: change.y });
  }
  return contacts;
}
