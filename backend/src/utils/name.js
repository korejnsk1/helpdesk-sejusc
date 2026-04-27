/**
 * Normalizes a person's name to Title Case.
 * Small connectors (de, da, do, das, dos, e) stay lowercase, matching
 * common Brazilian naming conventions.
 */
const LOWER_WORDS = new Set(["de", "da", "do", "das", "dos", "e", "em", "a", "o"]);

export function toTitleCase(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word, i) =>
      i === 0 || !LOWER_WORDS.has(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word
    )
    .join(" ");
}
