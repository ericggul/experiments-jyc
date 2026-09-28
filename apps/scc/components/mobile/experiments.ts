export const mobileExperiments = [
  { key: "finger-network/1", label: "finger-network/1", href: "/mobile/finger-network/1" },
  { key: "finger-network/2", label: "finger-network/2", href: "/mobile/finger-network/2" },
  { key: "finger-skating/1", label: "finger-skating/1", href: "/mobile/finger-skating/1" },
  { key: "gaze-tracking", label: "gaze-tracking", href: "/mobile/gaze-tracking" },
  { key: "transform/pixelate", label: "transform/pixelate", href: "/mobile/transform/pixelate" },
  { key: "transform/substitution", label: "transform/substitution", href: "/mobile/transform/substitution" },
  ...Array.from({ length: 13 }, (_, index) => ({
    key: `clone/${index + 1}`,
    label: `clone/${index + 1}`,
    href: `/sns/mobile/${index + 1}`,
  })),
] as const;
