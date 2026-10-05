export type ReferenceSource = Readonly<{
  description: string;
  id: string;
  links: readonly Readonly<{
    href: string;
    label: string;
  }>[];
  name: string;
  role: string;
}>;

export const referenceSources = [
  {
    id: "three",
    name: "Three.js",
    role: "The live technical ground",
    description:
      "Current TSL, WebGPU renderer, manual, examples, releases, and source patterns. Start here before trusting a technique from anywhere else.",
    links: [
      {
        label: "TSL specification",
        href: "https://threejs.org/docs/TSL.html",
      },
      {
        label: "WebGPU renderer",
        href: "https://threejs.org/docs/pages/WebGPURenderer.html",
      },
      {
        label: "Official examples",
        href: "https://threejs.org/examples/?q=webgpu",
      },
      {
        label: "Releases",
        href: "https://github.com/mrdoob/three.js/releases",
      },
    ],
  },
  {
    id: "heckel",
    name: "Maxime Heckel",
    role: "A visual essay becomes a working system",
    description:
      "Temporal images, atmosphere, light, materials, and screen-space effects developed as visual questions rather than detached shader recipes.",
    links: [
      { label: "Visit source", href: "https://blog.maximeheckel.com/" },
    ],
  },
  {
    id: "codrops",
    name: "Codrops Creative Hub",
    role: "A current field of working references",
    description:
      "Contemporary, source-backed experiments from creative developers. Use it to encounter what is being attempted now, then trace a specific technique to its source.",
    links: [
      {
        label: "Visit source",
        href: "https://tympanus.net/codrops/hub/all/",
      },
    ],
  },
  {
    id: "naili",
    name: "Adam Naili",
    role: "The translation layer",
    description:
      "Clear accounts of depth, raymarching, geometry, materials, and the production decisions that make an effect hold together in a real interactive scene.",
    links: [{ label: "Visit source", href: "https://blog.anaili.fr/" }],
  },
] as const satisfies readonly ReferenceSource[];
