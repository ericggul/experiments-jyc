import type { ComponentType } from "react";
import P13Chart from "./p13-chart";
import P13Cliff from "./p13-cliff";
import P13Table from "./p13-table";
import P16Report from "./p16-report";
import P18Blog from "./p18-blog";
import P18Notice from "./p18-notice";
import P19Blog from "./p19-blog";
import P19Cards from "./p19-cards";
import P19Comments from "./p19-comments";
import P20Meeting from "./p20-meeting";
import P20Portal from "./p20-portal";
import P4Gripper from "./p4-gripper";
import P4Strip from "./p4-strip";

// Figure regions that are rasters in the PDF, rebuilt in DOM; keyed by the
// figure ids in pages.json.
export const figures: Record<string, ComponentType> = {
  "p4-strip": P4Strip,
  "p4-gripper": P4Gripper,
  "p13-cliff": P13Cliff,
  "p13-chart": P13Chart,
  "p13-table": P13Table,
  "p16-report": P16Report,
  "p18-notice": P18Notice,
  "p18-blog": P18Blog,
  "p19-blog": P19Blog,
  "p19-comments": P19Comments,
  "p19-cards": P19Cards,
  "p20-meeting": P20Meeting,
  "p20-portal": P20Portal,
};
