import { PaperFitter } from "./fitter";
import { equation, equationSymbols, gothic, myeongjo, oldHangul } from "./fonts";
import { Sheet, type PaperFigures } from "./sheet";
import type { PaperPage } from "./types";

export { FitText } from "./fit-text";
export type { PaperFigures } from "./sheet";
export type * from "./types";

/** A stack of fixed-format exam sheets, one per screen. */
export function Paper({ pages, figures }: { pages: readonly PaperPage[]; figures: PaperFigures }) {
  return (
    <PaperFitter className={`${myeongjo.variable} ${gothic.variable} ${oldHangul.variable} ${equation.variable} ${equationSymbols.variable}`}>
      {pages.map((page) => (
        <Sheet key={page.n} page={page} figures={figures} />
      ))}
    </PaperFitter>
  );
}
