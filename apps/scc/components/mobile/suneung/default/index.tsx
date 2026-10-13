import { pages, figures } from "../korean-2026";
import { Paper } from "../paper";

/** The 2026 수능 국어 홀수형 booklet as DOM, one sheet per screen width. */
export default function SuneungDefault() {
  return <Paper pages={pages} figures={figures} />;
}
