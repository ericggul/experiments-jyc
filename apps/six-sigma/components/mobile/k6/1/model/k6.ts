export const vertices = Array.from({ length: 6 }, (_, id) => {
  const angle = (id * Math.PI) / 3 - Math.PI / 2;
  return { id, x: 200 + 176 * Math.cos(angle), y: 200 + 176 * Math.sin(angle) };
});

export const edges = vertices.flatMap((from, index) =>
  vertices.slice(index + 1).map((to) => ({ id: `${from.id}-${to.id}`, from, to })),
);

