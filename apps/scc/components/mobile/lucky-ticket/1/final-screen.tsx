import { messageForSeconds } from "./content";
import FinalPresentation from "../shared/final-presentation";

export default function LuckyTicketOneFinalScreen() {
  return (
    <main>
      <FinalPresentation message={messageForSeconds(0)} version={1} />
    </main>
  );
}
