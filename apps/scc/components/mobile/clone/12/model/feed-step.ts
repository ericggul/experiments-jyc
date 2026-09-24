export function feedStep(ids: readonly string[], currentId: string, direction: -1 | 1, canLoad: boolean) {
  const index = ids.indexOf(currentId);
  if (index < 0) return { nextId: null, requestMore: false };
  const nextId = ids[index + direction] ?? null;
  return { nextId, requestMore: !nextId && direction > 0 && canLoad };
}
