import { figures, pages } from "../math-2026";
import { Paper } from "../paper";

/** The 2026 수능 수학 홀수형 booklet as DOM, one page per screen. */
export default function SuneungMath() {
  return <Paper pages={pages} figures={figures} />;
}
