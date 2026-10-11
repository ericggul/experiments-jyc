import type { ComponentType } from "react";
import SubstitutionForm from "./1";
import SubstitutionCommand from "./2";

/** Each variant owns its renderer, styles and filter; the route only picks one. */
export const substitutionExperiments: Record<string, ComponentType<{ clone: string; embedded?: boolean }>> = {
  "1": SubstitutionForm,
  "2": SubstitutionCommand,
};
