# GPU particle safety and source clones

Read before particle, GPU-compute, or supplied R3F/TSL/WebGPU clone work.
Safety takes precedence when exact source reproduction exceeds an unverified
device budget; report that limitation instead of silently claiming fidelity.

## Performance budget

- Until the exact HTTPS route is observed on the user's device: at most
  **8,192 visible particles/sprites, DPR 1.0, and 24 Hz autonomous animation**,
  summed across the whole route.
- Begin with a static frame. Reduced motion stops autonomous updates. Bound and
  clean up schedulers. Use writable buffers/per-frame compute only when static
  attributes or material-time relations cannot express the actual model.
- Treat WebGL2 fallback separately; retain the lower budget until both paths
  are observed. Fallback alone does not establish safety.
- Higher count, DPR, multiple compute passes, post-processing, or uncapped loops
  require documented count/memory/draw-call/DPR/rate budgets, explicit permission
  for HTTPS browser observation, and a 30-second record of console, GPU-error,
  and device-loss results. Without permission, retain the safe budget and report
  the unverified requirement.
- After a reported freeze, crash, or material degradation, replace the route
  with its static safe path or remove its registration before further iteration.
  Do not ask the user to reopen an unsafe route for diagnosis.

## Supplied-source fidelity

Preserve the source's framework, renderer, primitive, camera, controls,
dependencies, and compute lifecycle unless requested otherwise or safety requires
a disclosed deviation. Check the app package and install required imports
(e.g. Fiber, Drei, uuid) before claiming a complete clone.

For the recorded particle pattern: seeds/offsets use `instancedArray`;
initialization uses `computeAsync` once; frames dispatch `compute` and the
material reads the same buffers. Resolve WebGPU/R3F typing with narrow,
version-checked assertions and JSX augmentation, not a different runtime or
CPU simulation.

Typecheck the app and lint changed files. When needed, with an existing HTTPS
server, observe the exact route for at
least 30 seconds; record canvas visibility, GPU/shader/runtime errors, device
loss, and warnings separately. If it runs, stop; do not add speculative fallbacks.

## Historical incident: attractor/3, 2026-09-02

A requested R3F Thomas-attractor clone was replaced with an imperative renderer,
different draw object, and CPU/WebGL fallback while Fiber/Drei were absent.
That was not a clone. The reported Mac crash cause remains **unconfirmed**:
no old-route console/GPU trace was observed.

The correction retained `Canvas → async WebGPURenderer → sprite → compute`
and source dependencies. The reported Mac rendered `/attractor/3` for 30 seconds
without WebGPU/shader/runtime errors; a `THREE.Clock` deprecation warning was
non-fatal. This historical observation is not a universal safety guarantee.

References: [Field Guide to TSL and WebGPU](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/),
[WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html).
