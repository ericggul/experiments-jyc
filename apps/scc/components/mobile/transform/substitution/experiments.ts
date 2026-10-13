import type { ComponentType } from "react";
import SubstitutionForm from "./1";
import SubstitutionCommand from "./2";
import SubstitutionPixel from "./3";

/** Each variant owns its renderer, styles and filter; the route only picks one. */
export const substitutionExperiments: Record<string, ComponentType<{ clone: string }>> = {
  "1": SubstitutionForm,
  "2": SubstitutionCommand,
  "3": SubstitutionPixel,
};

/** Variants made for only some clones; the others run on all fourteen. */
export const substitutionClones: Partial<Record<string, readonly string[]>> = {
  "3": ["11", "12", "13", "14"],
};
