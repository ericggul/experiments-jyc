# Mobile finger-network/2

- **Route:** `/mobile/finger-network/2`
- **Date:** 2026-09-28
- **Baseline:** `/mobile/finger-network/1`'s black field, white complete graph, and touch tracking. The baseline remains independently addressable.

The changed relation is five fingertips becoming the head, two hands, and two feet of one moving 2D human. The highest contact at the moment the fifth finger arrives becomes the head; the next two by height become left and right hands by x-position, and the lowest two become left and right feet. These roles remain bound to their touch identifiers while all five are held, so crossing fingers do not swap limbs. When fewer than two contacts remain, the figure fades and the original graph returns (see below for two to four fingers). The graphical body interpolates the endpoints with shoulders, elbows, hips, knees, neck, and torso; the rendering adds shaded volumes, facial detail, subtle breathing, and blinking. Since 2026-09-30 the shoulders sit a fixed 66 units (× body scale) below the head center instead of 28% of body height, so the neck no longer stretches. A same-day trial replaced the face with a plain textured oval; it was reverted and the original face restored. It is a stylized sculptural motion graphic, not a camera-derived or anatomically measured body.

The body follows touch positions with a damped response and uses the same bounded 2D canvas and 1.5 DPR cap as `/1`. A generated grayscale skin texture is clipped at low opacity to the shaded face, torso, and limbs; it is loaded only by `/2`. If Safari briefly reports zero contacts, the last pose is held for 180 ms and the instruction text waits 400 ms before returning. The iPhone's five-contact limit makes five the full-body state; six or more contacts return the graph.

## Two to four fingers (2026-09-30)

The figure now appears from two contacts, and the number of fingers sets the body's degrees of freedom. A rest-pose body is fitted to the held points by a 2D similarity transform (position, rotation, size), so the fit itself sets how much the body can move:

- **2 fingers:** top is the head, bottom is the point between the feet. The body is rigid, and the two fingers only move, turn (a full 360°), and resize it (0.25–2.4× the rest size). No joint moves.
- **3 fingers:** top is the head, the lower two are the feet. Position and rotation follow the best fit, while size stays at the value it had when the hand changed. The legs bend through the existing pose builder. The free arms are coupled to the stance, so spreading the feet raises the arms like a jumping jack.
- **4 fingers:** the top two are the hands and the bottom two are the feet. The free head rides above the torso and leans toward the hands.
- **5 fingers:** unchanged. Height ranking assigns roles, the frame is the screen, and the pose builder runs on raw endpoints.

Lifting a finger keeps the parts that are still held, so the body hangs from whatever remains; the released limb springs back to its rest place in the body frame. Adding a finger rereads the whole hand by height. Frame and endpoints follow with the same damped response; rotation takes the shortest turn. Contact rings mark only held parts. The figure is drawn in an upright local frame under a canvas transform, so the renderer's upright shading assumptions hold when the body is rotated.

A small centered monospace readout at the bottom streams the body's state: held-finger count and input DOF, held-part bitmask (head, left hand, right hand, left foot, right foot), pelvis position, lean, size, height, hand span, stance, elbow and knee angles, breath, eye state, and figure opacity. It is written directly to the DOM at about 12 Hz and fades with the figure.

Shadow blur now applies only to silhouette shapes (limbs, torso, head, hair, ears, hands, feet); interior joints, limb highlights, chest and abdominal marks, toes, and facial features draw without it. The glow at the outline is intended to look the same, though this is unmeasured on device, and so is the frame-time gain.

Pure rig tests cover role assignment, identifier persistence through finger crossings, finite joint geometry, exact rigid two-finger placement across rotation, held-limb articulation for three and four fingers, and binding persistence as fingers lift. Rendering and multi-finger motion on an actual iPhone remain unverified, including whether rereading by height on a finger's return feels abrupt.
