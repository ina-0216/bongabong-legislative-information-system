const ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  bull: '•',
  gt: '>',
  ldquo: '“',
  lsquo: '‘',
  lt: '<',
  mdash: '—',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  rdquo: '”',
  rsquo: '’',
};

const decodeEntity = (entity: string): string => {
  if (entity[0] === '#') {
    const isHex = entity[1]?.toLowerCase() === 'x';
    const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    if (Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff) {
      return String.fromCodePoint(codePoint);
    }
    return '';
  }

  return ENTITIES[entity.toLowerCase()] ?? `&${entity};`;
};

/** Converts CMS rich text to readable plain text for native Text components. */
export const htmlToText = (html: string): string =>
  html
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '• ')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)\s*>/gi, '\n')
    .replace(/<hr\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi, (_match, entity: string) =>
      decodeEntity(entity),
    )
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\n[\t ]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
