import type { ComponentType } from "react";
import P10Pouch from "./p10-pouch";
import P11Boxes from "./p11-boxes";
import P14Solid from "./p14-solid";
import P19Cylinder from "./p19-cylinder";
import P19Tetrahedron from "./p19-tetrahedron";
import P20Ellipse from "./p20-ellipse";
import P2Parabolas from "./p2-parabolas";
import P5Circles from "./p5-circles";

// Diagrams that are rasters in the PDF, redrawn in DOM; keyed by the figure ids in pages.json.
export const figures: Record<string, ComponentType> = {
  "p2-parabolas": P2Parabolas,
  "p5-circles": P5Circles,
  "p10-pouch": P10Pouch,
  "p11-boxes": P11Boxes,
  "p14-solid": P14Solid,
  "p19-cylinder": P19Cylinder,
  "p19-tetrahedron": P19Tetrahedron,
  "p20-ellipse": P20Ellipse,
};
