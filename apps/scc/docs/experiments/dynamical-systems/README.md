# Dynamical-systems experiments

This family holds runnable studies whose primary material is a defined
time-evolving state: an ODE, discrete map, orbit, or related deterministic
system. It is separate from `complex-systems`: a mathematical connection is not
permission to inherit that family’s routes, visual language, or model claims.

## Family contract

- A group owns `components/dynamical-systems/[group]/`, its registry, a thin
  `app/(dynamical-systems)/[group]/[experiment]/page.tsx` dispatcher, and its
  matching documentation folder.
- `/dynamical-systems` is the shared SCC navigation scoped to this family; add
  each new variant with its creation date to `components/navigation/experiments.ts`.
  A family registry remains the executable source of truth.
- A numbered trial is a preserved implementation. Fork a working variant before
  changing a model, numerical method, parameter, or perceptual mapping; do not
  couple a later variation back into an earlier route through a shared mutable
  abstraction.
- A renderer may encode state, trajectory, or an explicitly documented derived
  observation. It must not use arbitrary camera motion, glow, labels, metrics,
  stars, or faux scientific instrumentation to imply dynamics that the model
  does not contain.
- Each variant documents its system boundary, numerical method, participant
  situation, visible parameter, interaction (if any), model invariants, and
  unresolved next question. Pure model tests check the claims that can be
  checked without a browser.

## Current groups

- [attractor](./attractor/README.md): six three-dimensional autonomous ODE
  trajectories, relocated intact from the former complex-systems ownership.
- [three-body](./three-body/README.md): Burrau's unequal-mass Pythagorean
  initial-value problem, integrated as a single field-first orbit study.
- [duffing](./duffing/README.md): a driven, damped double-well oscillator;
  `/1` is an editable coefficient surface, `/2` a GPU particle ring of balls
  rolling in the drive-tilted well, `/3` the same ring under a drifting drive.
- [bifurcation](./bifurcation/README.md): `/1` holds the logistic parameter in
  stages; `/2` gives every map particle its own parameter (a rejected,
  diagram-shaped trial); `/3` carries particles through 3D flows whose
  parameter drifts, so splits, loops and chaos are lived through in time.
- [orbital-resonance](./orbital-resonance/README.md): test particles around a
  star and one planet in the planet's rotating frame, where period-matched
  orbits trace standing figures.
