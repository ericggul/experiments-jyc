# Mobile ui-collage

Everyday interface components (loaders, progress bars, sliders) are cloned faithfully from many platforms and eras, then tiled across the phone screen so that finger skating plays them as one surface. The family began as `mobile/loading` on 2026-10-03 and was renamed before its first commit, once sliders made "loading" too narrow. Each route is independent; none imports another.

- [loading/1](loading-1.md): a centred grid of twelve circular phone loaders that fill by themselves; skating restarts each one it crosses. `/mobile/ui-collage/loading/1`.
- [loading/2](loading-2.md): full-width horizontal progress bars in eighteen historic styles from MS-DOS Setup to Material 3, stacked in rows; skating sets each bar it crosses to the crossing position (mid-screen is 50%). `/mobile/ui-collage/loading/2`.
- [sliders/1](sliders-1.md): narrow vertical sliders in historic-to-current designs; skating sets each slider it crosses to the finger's height, like drawing on a graphic equaliser, and sounds each slider's pentatonic note (low at the bottom, high at the top). `/mobile/ui-collage/sliders/1`.
