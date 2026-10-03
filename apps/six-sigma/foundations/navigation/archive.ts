// Dates are registry data; `/<area>/<MMDD>` archives are derived from them.
export function getSixSigmaArchive(item: { key: string; date: string }) {
  return `${item.key.split("/")[0]}/${item.date.slice(5).replace("-", "")}`;
}
