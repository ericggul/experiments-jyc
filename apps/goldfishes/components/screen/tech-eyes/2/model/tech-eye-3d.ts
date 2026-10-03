// Source-inspired studies, not measured reconstructions of these people's irises.
// Kept separate from the concurrently developed photographic blink trial.
export const techEye3DStudies = [
  { index: 0, id: "001", name: "Sam Altman", atlas: 0, seed: 17 },
  { index: 1, id: "002", name: "Mark Zuckerberg", atlas: 1, seed: 31 },
  { index: 2, id: "003", name: "Jensen Huang", atlas: 2, seed: 53 },
  { index: 3, id: "004", name: "Sundar Pichai", atlas: 3, seed: 79 },
  { index: 4, id: "005", name: "Dario Amodei", atlas: 4, seed: 97 },
] as const;

export const TECH_EYE_3D_TRIAL = new Set<number>(techEye3DStudies.map((study) => study.index));
