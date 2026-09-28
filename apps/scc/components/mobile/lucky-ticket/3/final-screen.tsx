import { messageForSeconds } from "./content";
import ScatteredPresentation from "./scattered-presentation";

export default function LuckyTicketThreeFinalScreen() {
  return (
    <main>
      <ScatteredPresentation message={messageForSeconds(0)} />
    </main>
  );
}
