# camera-monolith

Route: `/camera-monolith/screen` and `/camera-monolith/mobile` · Date: 2026-09-14

## Tested relation

Discrete self-images from multiple mobile cameras become one ordered, spatially selected duration on a shared screen. The screen does not show incoming imagery until a participant selects cells; each accepted frame then becomes the current surface and the previous interval moves downward into the monolith.

## Baseline and intervention

The visual and interaction baseline is Goldfishes `/screen/0806/duration`: its dark dotted field, click/drag selection, keyboard selection and clearing, full camera orbit/zoom, orthographic initial view, optional 2×2 blocks, duration growth, media strata, theme and collapsed parameter panel are retained. The goldfish meshes and static company/cat/kiss/politician atlases are absent. The unchanged surface choices now all select the camera stream except `WHITE`, which retains the original untextured block state.

`/camera-monolith/mobile` starts camera access only after the participant presses `카메라 시작`. It publishes the resulting `MediaStream` as a WebRTC video track, shows the real preview, permits camera switching through `RTCRtpSender.replaceTrack`, and stops every media track on stop or unmount. The screen keeps one hidden video decoder per publisher, takes a centered square whose side is exactly `min(videoWidth, videoHeight)`, and scales that complete square to a 240×240 `ImageBitmap`. For a 320×240 source the crop is therefore the centered 240×240 area. The atlas only downsamples that already-square bitmap to 128×128; it does not crop it again. That serial sampling order is the FIFO order consumed by the monolith. `Duration > frame interval (ms)` controls the live screen sampling period (`500ms` by default), while `Duration > vertical scale` stretches only the monolith's temporal Y axis (`1.2×` by default); X/Z cell geometry retains the duration baseline scale of `2`.

SCC Socket.IO owns room membership, presence, role validation, publisher/viewer pairing and targeted WebRTC offer/answer/ICE signaling. Only joined mobiles can publish and only joined screens can view; signaling is rejected unless it belongs to an active publisher-viewer pair. Camera bytes never pass through polling or Socket.IO. The browser owns capture, screen-side temporal sampling, FIFO sequencing, crop, bitmap creation, atlas placement, geometry and animation.

## Safety bounds

- The screen queue holds at most 120 decoded 240×240 bitmaps; rejected or consumed bitmaps are closed immediately.
- The GPU atlas is one 2048×2048 canvas containing 256 reusable 128px tiles.
- Temporal history is one 2,048-instance strata ring buffer.
- Rendering is capped at 24 Hz and DPR 1.0; temporal height growth runs in the vertex shader rather than rebuilding every pillar matrix on every animation frame.
- Screen sampling creates `ImageBitmap` snapshots directly, avoiding a JPEG encode/decode round trip; atlas mipmap regeneration is disabled.

Because atlas tiles are reused, very old strata eventually show newer frames in the same bounded slot. This is the deliberate memory ceiling, not evidence of an unlimited archive. The direct publisher-to-screen WebRTC topology follows the NRF reference and is suitable for this local one-screen experiment; multiple simultaneous screens multiply each mobile's upload encodes, so a larger deployment needs TURN plus an SFU/compositor.

## Files

- `components/standalone/camera-monolith/mobile/`: capture and minimal participant UI.
- `components/standalone/camera-monolith/screen/`: duration interaction and screen composition.
- `components/standalone/camera-monolith/rendering/`: bounded frame atlas and instanced monolith.
- `components/standalone/camera-monolith/transport/`: shared protocol and Socket.IO client.
- `socket/experiments/camera-monolith/`: isolated relay handler and validation tests.
