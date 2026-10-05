# Complex-systems experiment rules

This directory records scientific and visual requirements for SCC
complex-systems experiments. Existing routes are evidence and implementation
history. They are not a design system and must not be copied as one.

Current mathematical demonstrators: [Barabási–Albert network growth / 1](barabasi-albert/README.md) and [Erdős–Rényi random graph / 1](erdos-renyi/README.md). Self-similar studies live under [fractal](fractal/README.md) (clock, logo).

## Visual rule: no inherited complex-systems style

Do not start a new experiment by reusing the visual grammar of another
complex-systems route. In particular, the following recurring composition is
prohibited as a default:

- a pale mineral or paper field;
- an oversized serif title in a viewport corner;
- small monospaced instructions, counters, or symbolic event totals;
- pause, reset, or reseed buttons placed in another corner;
- simulation content used as a background between interface readouts;
- muted graph lines and circles adopted simply because the object is a network.

These choices are not neutral. Together they produce a recognizable generated
experiment template, make unrelated systems look interchangeable, and place
interface styling ahead of the phenomenon. A route may use any individual
element only when its specific participant task requires it.

Before styling, write down:

1. What must dominate the participant's vision?
2. Which model-state differences must be distinguishable without reading text?
3. What is the minimum permanent interface required for the assigned action?
4. Which visual properties are direct encodings of state, and which are merely
   decoration?
5. Would the same screen still make sense after replacing the system's name? If
   yes, the wrapper is insufficiently specific and must be redesigned.

For a field-based perceptual experiment, begin with only the field. Do not add a
title, legend, metric, explanation, or control until a concrete interaction or
observation failure proves it necessary. Scientific measurements belong in
tests and experiment records unless the participant actually needs them.
