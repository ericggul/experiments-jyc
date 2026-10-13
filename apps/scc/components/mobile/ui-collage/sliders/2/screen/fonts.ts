// Faces are drawn at random (see `cast.ts`). The Latin pool takes ten from each of Google Fonts' five
// categories so every category is equally likely; other scripts get smaller pools of faces that carry them.
// Faces load at runtime from the Google Fonts CSS API, subset to just the characters a column prints
// (`text=`), so a column costs one small file and nothing is downloaded at build time.

export type Face = { family: string; weight: number };

const pool = (...faces: [family: string, weight: number][]): Face[] => faces.map(([family, weight]) => ({ family, weight }));

export type Script = "latin" | "cyrillic" | "greek" | "hangul" | "japanese" | "han" | "arabic" | "hebrew" | "devanagari" | "thai";

export const pools: Record<Script, readonly Face[]> = {
  latin: pool(
  // sans-serif
  ["Inter", 900], ["Montserrat", 800], ["Poppins", 300], ["Work Sans", 200], ["Archivo Black", 400], ["Space Grotesk", 700], ["Rubik", 500],
  ["Josefin Sans", 300], ["Jost", 600], ["Syne", 800],
  // serif
  ["Playfair Display", 900], ["EB Garamond", 500], ["Roboto Slab", 900], ["Abril Fatface", 400], ["Libre Baskerville", 700], ["DM Serif Display", 400],
  ["Cormorant Garamond", 300], ["Zilla Slab", 700], ["Bodoni Moda", 400], ["Lora", 400],
  // display
  ["Bungee", 400], ["Monoton", 400], ["Creepster", 400], ["Orbitron", 900], ["Bungee Shade", 400], ["Saira Stencil One", 400], ["Six Caps", 400],
  ["Bebas Neue", 400], ["UnifrakturMaguntia", 400], ["Shrikhand", 400],
  // handwriting
  ["Caveat", 700], ["Permanent Marker", 400], ["Pacifico", 400], ["Dancing Script", 700], ["Indie Flower", 400], ["Shadows Into Light", 400],
  ["Kalam", 700], ["Satisfy", 400], ["Gochi Hand", 400], ["Rock Salt", 400],
  // monospace
  ["Space Mono", 700], ["Courier Prime", 700], ["VT323", 400], ["Major Mono Display", 400], ["IBM Plex Mono", 500], ["JetBrains Mono", 800],
  ["Fira Code", 300], ["Roboto Mono", 700], ["Source Code Pro", 900], ["Press Start 2P", 400],
  ),
  cyrillic: pool(
    ["Montserrat", 800], ["Fira Sans", 300], ["Comfortaa", 700], ["PT Serif", 700], ["Noto Serif", 900], ["Russo One", 400], ["Ruslan Display", 400],
    ["Rubik Mono One", 400], ["Neucha", 400], ["Caveat", 700], ["Press Start 2P", 400], ["JetBrains Mono", 800],
  ),
  greek: pool(
    ["Fira Sans", 300], ["Comfortaa", 700], ["Advent Pro", 200], ["GFS Didot", 400], ["Noto Serif", 900], ["Dela Gothic One", 400], ["Zen Maru Gothic", 300],
    ["Press Start 2P", 400], ["Fira Code", 300], ["JetBrains Mono", 800],
  ),
  hangul: pool(
    ["Noto Sans KR", 900], ["Nanum Myeongjo", 800], ["Black Han Sans", 400], ["Nanum Pen Script", 400], ["Do Hyeon", 400], ["Gowun Batang", 700], ["Jua", 400],
    ["Song Myung", 400],
  ),
  japanese: pool(
    ["Noto Serif JP", 900], ["Dela Gothic One", 400], ["Yusei Magic", 400], ["Zen Maru Gothic", 300], ["Kaisei Decol", 700], ["DotGothic16", 400],
    ["RocknRoll One", 400], ["Reggae One", 400],
  ),
  han: pool(
    ["Noto Sans SC", 900], ["Noto Serif SC", 300], ["ZCOOL KuaiLe", 400], ["Ma Shan Zheng", 400], ["Long Cang", 400], ["ZCOOL QingKe HuangYou", 400],
  ),
  arabic: pool(
    ["Noto Kufi Arabic", 800], ["Amiri", 700], ["Reem Kufi", 400], ["Lalezar", 400], ["Cairo", 200], ["Aref Ruqaa", 400],
  ),
  hebrew: pool(
    ["Frank Ruhl Libre", 700], ["Suez One", 400], ["Secular One", 400], ["Heebo", 100], ["Bellefair", 400],
  ),
  devanagari: pool(
    ["Martel", 800], ["Rozha One", 400], ["Yatra One", 400], ["Hind", 300], ["Kalam", 700], ["Teko", 600],
  ),
  thai: pool(
    ["Kanit", 800], ["Sriracha", 400], ["Chakra Petch", 300], ["Mitr", 500], ["Charm", 700], ["Noto Serif Thai", 900],
  ),
};

/** A column ready to rasterise: its text and the canvas font that draws it. */
export type Loaded = { text: string; font: string };

const pending = new Map<string, Promise<string | null>>();

/** Fetches the face subset to `text` and registers it under its own alias; null if it cannot load. */
function loadSubset(face: Face, text: string) {
  const characters = [...new Set(`${text} `)].join("");
  const key = `${face.family}|${face.weight}|${characters}`;
  let request = pending.get(key);
  if (!request) {
    const alias = `ui-collage-sliders-2-${pending.size}`;
    const family = face.family.replaceAll(" ", "+");
    const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${face.weight}&text=${encodeURIComponent(characters)}&display=block`;
    request = fetch(url)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
      .then((css) => {
        const source = /src:\s*(url\([^)]+\)[^;]*)/.exec(css)?.[1];
        if (!source) throw new Error("no src");
        return new FontFace(alias, source, { weight: String(face.weight) }).load();
      })
      .then((loaded) => {
        document.fonts.add(loaded);
        return alias;
      })
      .catch(() => null);
    pending.set(key, request);
  }
  return request;
}

/** Resolves once every column's face can draw that column's text; a face that fails falls back to the system face. */
export function loadFaces(lines: readonly { text: string; face: Face }[]): Promise<Loaded[]> {
  return Promise.all(
    lines.map(async ({ text, face }) => {
      const alias = await loadSubset(face, text);
      return { text, font: `${face.weight} 100px ${alias ? `"${alias}"` : `"${face.family}", sans-serif`}` };
    }),
  );
}
