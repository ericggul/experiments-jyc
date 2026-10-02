# Mobile experiments

The component family is `apps/scc/components/mobile/`. Its `clone/1`–`clone/13` entries preserve the SNS mobile variants; the public routes remain `/sns/mobile/1`–`/sns/mobile/13` so existing links continue to work. Their individual records remain in [SNS mobile](../sns/mobile/README.md).

`finger-skating/1` is a single-device arrow field changed directly by a moving finger source at [`/mobile/finger-skating/1`](../../../app/mobile/finger-skating/[experiment]/page.tsx). See [finger skating](finger-skating.md).

`lucky-ticket/1`–`/3` are full-viewport scratch-off fortunes with one-line, long-form, and scattered-word presentations at [`/mobile/lucky-ticket/[experiment]`](../../../app/mobile/lucky-ticket/[experiment]/page.tsx). See [lucky ticket](lucky-ticket.md).

`face-trace/1` keeps the live eye and mouth cutouts inside a full-screen `face-voronoi/3` `face-gradient 3` lattice made only of those features and their short echoes. Opening the mouth swells and melts the lattice outward from the mouth. It is at [`/mobile/face-trace/1`](../../../app/mobile/face-trace/[experiment]/page.tsx). See [face trace](face-trace.md).

`finger-network/1` maps each active mobile touch to a node and joins every pair at [`/mobile/finger-network/1`](../../../app/mobile/finger-network/[experiment]/page.tsx). See [finger network](finger-network.md).

`finger-network/2` keeps the network baseline and turns two to five active touches into a continuously moving 2D human figure whose freedom grows with the finger count at [`/mobile/finger-network/2`](../../../app/mobile/finger-network/[experiment]/page.tsx). See [finger network /2](finger-network-2.md).

`finger-network/3` copies `/1`'s network but keeps every node after its finger lifts; each touch session is a complete graph and earlier sessions join only nearby nodes at [`/mobile/finger-network/3`](../../../app/mobile/finger-network/[experiment]/page.tsx). See [finger network /3](finger-network-3.md).

`gaze-tracking/1` preserves the independent camera-input study. The [`/mobile/gaze-tracking`](../../../app/mobile/gaze-tracking/page.tsx) index also links to `gaze-tracking/2`, which applies gaze-driven difference circles, liquid displacement, or a local-curl mesh distortion to each of the 13 clones. See [gaze tracking](gaze-tracking.md) for the sensing and accuracy boundary.

`transform/pixelate/` applies one shared viewport raster effect to any of the 13 archived clones without editing them. The selection index is at [`/mobile/transform/pixelate`](../../../app/mobile/transform/pixelate/page.tsx). See [pixelate](pixelate.md) for its rendering and interaction boundary.

`transform/substitution/1` switches between the original clone, object outlines, and representative colors. `substitution/2` adds uppercase command readings in three vocabulary groups, with an original mode. Both share one renderer across all 13 clones. The selection index is at [`/mobile/transform/substitution`](../../../app/mobile/transform/substitution/page.tsx). See [substitution](substitution.md).
