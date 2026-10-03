/** The 40 states of the chain. Order is the column order of every lexicon file. */
export type Language = {
  code: string;
  name: string;
  family: string;
  script: string;
  /** Rough centroid of the speech area, used only for transition affinity. */
  lat: number;
  lon: number;
  rtl?: true;
};

export const languages: readonly Language[] = [
  { code: "ko", name: "한국어", family: "koreanic", script: "hangul", lat: 37, lon: 127.5 },
  { code: "en", name: "English", family: "germanic", script: "latin", lat: 52, lon: -1.5 },
  { code: "ja", name: "日本語", family: "japonic", script: "japanese", lat: 36, lon: 138 },
  { code: "zh", name: "中文", family: "sinitic", script: "han", lat: 33, lon: 112 },
  { code: "vi", name: "Tiếng Việt", family: "austroasiatic", script: "latin", lat: 16, lon: 107 },
  { code: "th", name: "ไทย", family: "kra-dai", script: "thai", lat: 15, lon: 101 },
  { code: "id", name: "Bahasa Indonesia", family: "austronesian", script: "latin", lat: -6, lon: 107 },
  { code: "tl", name: "Tagalog", family: "austronesian", script: "latin", lat: 14.5, lon: 121 },
  { code: "hi", name: "हिन्दी", family: "indo-aryan", script: "devanagari", lat: 26, lon: 80 },
  { code: "bn", name: "বাংলা", family: "indo-aryan", script: "bengali", lat: 23.5, lon: 90 },
  { code: "ta", name: "தமிழ்", family: "dravidian", script: "tamil", lat: 11, lon: 78.5 },
  { code: "ur", name: "اردو", family: "indo-aryan", script: "arabic", lat: 30, lon: 71, rtl: true },
  { code: "fa", name: "فارسی", family: "iranian", script: "arabic", lat: 32.5, lon: 53.5, rtl: true },
  { code: "ar", name: "العربية", family: "semitic", script: "arabic", lat: 26, lon: 38, rtl: true },
  { code: "he", name: "עברית", family: "semitic", script: "hebrew", lat: 31.5, lon: 35, rtl: true },
  { code: "tr", name: "Türkçe", family: "turkic", script: "latin", lat: 39, lon: 35 },
  { code: "ru", name: "Русский", family: "slavic", script: "cyrillic", lat: 56, lon: 40 },
  { code: "uk", name: "Українська", family: "slavic", script: "cyrillic", lat: 49, lon: 31 },
  { code: "pl", name: "Polski", family: "slavic", script: "latin", lat: 52, lon: 19 },
  { code: "cs", name: "Čeština", family: "slavic", script: "latin", lat: 49.8, lon: 15.5 },
  { code: "hu", name: "Magyar", family: "uralic", script: "latin", lat: 47, lon: 19.5 },
  { code: "ro", name: "Română", family: "romance", script: "latin", lat: 45.9, lon: 25 },
  { code: "el", name: "Ελληνικά", family: "hellenic", script: "greek", lat: 39, lon: 22 },
  { code: "fi", name: "Suomi", family: "uralic", script: "latin", lat: 62, lon: 25.7 },
  { code: "de", name: "Deutsch", family: "germanic", script: "latin", lat: 51, lon: 10 },
  { code: "nl", name: "Nederlands", family: "germanic", script: "latin", lat: 52.2, lon: 5.3 },
  { code: "sv", name: "Svenska", family: "germanic", script: "latin", lat: 60, lon: 15 },
  { code: "eu", name: "Euskara", family: "isolate", script: "latin", lat: 43, lon: -2.3 },
  { code: "fr", name: "Français", family: "romance", script: "latin", lat: 46.5, lon: 2.5 },
  { code: "es", name: "Español", family: "romance", script: "latin", lat: 40, lon: -3.7 },
  { code: "pt", name: "Português", family: "romance", script: "latin", lat: 39.5, lon: -8 },
  { code: "it", name: "Italiano", family: "romance", script: "latin", lat: 42.8, lon: 12.5 },
  { code: "sw", name: "Kiswahili", family: "bantu", script: "latin", lat: -6, lon: 35 },
  { code: "am", name: "አማርኛ", family: "semitic", script: "ethiopic", lat: 9, lon: 39 },
  { code: "ka", name: "ქართული", family: "kartvelian", script: "georgian", lat: 42.3, lon: 43.4 },
  { code: "hy", name: "Հայերեն", family: "armenian", script: "armenian", lat: 40.2, lon: 44.9 },
  { code: "mn", name: "Монгол", family: "mongolic", script: "cyrillic", lat: 47, lon: 104 },
  { code: "km", name: "ខ្មែរ", family: "austroasiatic", script: "khmer", lat: 12.5, lon: 105 },
  { code: "my", name: "မြန်မာ", family: "sino-tibetan", script: "myanmar", lat: 20, lon: 96 },
  { code: "si", name: "සිංහල", family: "indo-aryan", script: "sinhala", lat: 7.5, lon: 80.7 },
];

export const languageIndex = new Map(languages.map((language, index) => [language.code, index]));
