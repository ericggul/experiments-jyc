import { message } from "./content";
import FinalPresentation from "../shared/final-presentation";

export default function LuckyTicketTwoFinalScreen() {
  return (
    <main>
      <FinalPresentation message={message} version={2} />
    </main>
  );
}
