# Mobile finger-network/2

- **Route:** `/mobile/finger-network/2`
- **Date:** 2026-09-28
- **Baseline:** `/mobile/finger-network/1`'s black field, white complete graph, and touch tracking. The baseline remains independently addressable.

The changed relation is five fingertips becoming the head, two hands, and two feet of one moving 2D human. The highest contact at the moment the fifth finger arrives becomes the head; the next two by height become left and right hands by x-position, and the lowest two become left and right feet. These roles remain bound to their touch identifiers while all five are held, so crossing fingers do not swap limbs. When fewer than five contacts remain, the figure fades and the original graph returns. The graphical body interpolates the endpoints with shoulders, elbows, hips, knees, neck, and torso; the rendering adds shaded volumes, facial detail, subtle breathing, and blinking. It is a stylized sculptural motion graphic, not a camera-derived or anatomically measured body.

The body follows touch positions with a damped response and uses the same bounded 2D canvas and 1.5 DPR cap as `/1`. A generated grayscale skin texture is clipped at low opacity to the shaded face, torso, and limbs; it is loaded only by `/2`. If Safari briefly reports zero contacts, the last pose is held for 180 ms and the instruction text waits 400 ms before returning. Pure rig tests cover role assignment, identifier persistence through finger crossings, and finite joint geometry. Rendering and five-finger motion on an actual iPhone remain unverified. The iPhone's five-contact limit makes the fifth finger the target state; adding more contacts is outside this variant's interaction contract.
