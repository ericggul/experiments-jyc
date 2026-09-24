export const mobileExperiments = [
  { key: "gaze-tracking", label: "gaze-tracking", href: "/mobile/gaze-tracking" },
  { key: "transform/pixelate", label: "transform/pixelate", href: "/mobile/transform/pixelate" },
  ...Array.from({ length: 13 }, (_, index) => ({
    key: `clone/${index + 1}`,
    label: `clone/${index + 1}`,
    href: `/sns/mobile/${index + 1}`,
  })),
] as const;
