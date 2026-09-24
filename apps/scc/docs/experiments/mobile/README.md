# Mobile experiments

The component family is `apps/scc/components/mobile/`. Its `clone/1`–`clone/13` entries preserve the SNS mobile variants; the public routes remain `/sns/mobile/1`–`/sns/mobile/13` so existing links continue to work. Their individual records remain in [SNS mobile](../sns/mobile/README.md).

`gaze-tracking/` is an independent camera-input study at [`/mobile/gaze-tracking`](../../../app/mobile/gaze-tracking/page.tsx). See [gaze tracking](gaze-tracking.md) for the sensing and accuracy boundary.

`transform/pixelate/` applies one shared viewport raster effect to any of the 13 archived clones without editing them. The selection index is at [`/mobile/transform/pixelate`](../../../app/mobile/transform/pixelate/page.tsx). See [pixelate](pixelate.md) for its rendering and interaction boundary.
