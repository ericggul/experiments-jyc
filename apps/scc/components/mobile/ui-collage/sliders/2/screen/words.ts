import type { Script } from "./fonts";

/** "Slider" as interfaces name the control, capitalised where the script has capitals. */
export const words: readonly { id: string; text: string; script: Script }[] = [
  { id: "en", text: "SLIDER", script: "latin" },
  { id: "fr", text: "CURSEUR", script: "latin" },
  { id: "es", text: "DESLIZADOR", script: "latin" },
  { id: "de", text: "SCHIEBEREGLER", script: "latin" },
  { id: "it", text: "CURSORE", script: "latin" },
  { id: "pt", text: "CONTROLE DESLIZANTE", script: "latin" },
  { id: "tr", text: "KAYDIRICI", script: "latin" },
  { id: "pl", text: "SUWAK", script: "latin" },
  { id: "cs", text: "POSUVNÍK", script: "latin" },
  { id: "sv", text: "REGLAGE", script: "latin" },
  { id: "fi", text: "LIUKUSÄÄDIN", script: "latin" },
  { id: "id", text: "PENGGESER", script: "latin" },
  { id: "vi", text: "THANH TRƯỢT", script: "latin" },
  { id: "ru", text: "ПОЛЗУНОК", script: "cyrillic" },
  { id: "uk", text: "ПОВЗУНОК", script: "cyrillic" },
  { id: "el", text: "ΡΥΘΜΙΣΤΙΚΟ", script: "greek" },
  { id: "ko", text: "슬라이더", script: "hangul" },
  { id: "ja", text: "スライダー", script: "japanese" },
  { id: "zh", text: "滑块", script: "han" },
  { id: "ar", text: "شريط التمرير", script: "arabic" },
  { id: "he", text: "מחוון", script: "hebrew" },
  { id: "hi", text: "स्लाइडर", script: "devanagari" },
  { id: "th", text: "แถบเลื่อน", script: "thai" },
];
