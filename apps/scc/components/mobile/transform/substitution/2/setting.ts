import type { Presentation } from "./renderer";
import type { CommandGroup } from "./semantic";

export { commandGroups } from "./semantic";

/** The filter's two independent controls: how commands are shown, and which vocabulary they use. */
export type CommandSetting = { presentation: Presentation | "original"; group: CommandGroup };

export const presentations: { id: Presentation; label: string }[] = [
  { id: "replace", label: "완전 대체" },
  { id: "overlay", label: "오버레이" },
  { id: "reveal", label: "호버 / 손가락 리빌" },
];

/** A host page (e.g. `/mobiles/2`) frames `substitution/2/<clone>?embed` and sets its filter by message. */
export const settingMessage = "substitution-command:setting";
export const readyMessage = "substitution-command:ready";
export const embedSource = (clone: string) => `/mobile/transform/substitution/2/${clone}?embed`;
