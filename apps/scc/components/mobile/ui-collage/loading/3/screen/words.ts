import type { Script } from "./fonts";

/** "Loading" as interfaces print it, capitalised where the script has capitals. */
export const words: readonly { id: string; text: string; script: Script }[] = [
  { id: "en", text: "LOADING", script: "latin" },
  { id: "fr", text: "CHARGEMENT", script: "latin" },
  { id: "es", text: "CARGANDO", script: "latin" },
  { id: "de", text: "LADEN", script: "latin" },
  { id: "it", text: "CARICAMENTO", script: "latin" },
  { id: "pt", text: "CARREGANDO", script: "latin" },
  { id: "tr", text: "YÜKLENİYOR", script: "latin" },
  { id: "pl", text: "ŁADOWANIE", script: "latin" },
  { id: "cs", text: "NAČÍTÁNÍ", script: "latin" },
  { id: "sv", text: "LADDAR", script: "latin" },
  { id: "fi", text: "LADATAAN", script: "latin" },
  { id: "id", text: "MEMUAT", script: "latin" },
  { id: "vi", text: "ĐANG TẢI", script: "latin" },
  { id: "ru", text: "ЗАГРУЗКА", script: "cyrillic" },
  { id: "uk", text: "ЗАВАНТАЖЕННЯ", script: "cyrillic" },
  { id: "el", text: "ΦΟΡΤΩΣΗ", script: "greek" },
  { id: "ko", text: "로딩 중", script: "hangul" },
  { id: "ja", text: "読み込み中", script: "japanese" },
  { id: "zh", text: "加载中", script: "han" },
  { id: "ar", text: "جارٍ التحميل", script: "arabic" },
  { id: "he", text: "טוען", script: "hebrew" },
  { id: "hi", text: "लोड हो रहा है", script: "devanagari" },
  { id: "th", text: "กำลังโหลด", script: "thai" },
];
