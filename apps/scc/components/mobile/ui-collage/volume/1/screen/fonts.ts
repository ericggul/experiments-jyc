// Each column's face is drawn at random from ten faces in each of Google Fonts' five categories (sans-serif,
// serif, display, handwriting, monospace), so every category is equally likely. Faces load at runtime from the
// Google Fonts CSS API, subset (`text=`) to the characters of the whole lyric, so a column can take any word
// the moment it is sung.

export type Face = { family: string; weight: number };

const pool = (...faces: [family: string, weight: number][]): Face[] => faces.map(([family, weight]) => ({ family, weight }));

export const faces: readonly Face[] = pool(
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
);

const pending = new Map<string, Promise<string | null>>();

/** Fetches the face subset to `text` and registers it under its own alias; null if it cannot load. */
function loadSubset(face: Face, text: string) {
  const characters = [...new Set(`${text} `)].join("");
  const key = `${face.family}|${face.weight}|${characters}`;
  let request = pending.get(key);
  if (!request) {
    const alias = `ui-collage-volume-1-${pending.size}`;
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

/** Resolves to one canvas font per face (its loaded alias, or the system face if it failed), sized at 100 px. */
export function loadFaces(chosen: readonly Face[], text: string): Promise<string[]> {
  return Promise.all(
    chosen.map(async (face) => {
      const alias = await loadSubset(face, text);
      return `${face.weight} 100px ${alias ? `"${alias}"` : `"${face.family}", sans-serif`}`;
    }),
  );
}
