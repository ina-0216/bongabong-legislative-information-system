export function pdfFilename(...parts: Array<string | number | null | undefined>): string {
  let stem = parts
    .map((part) => String(part ?? '').normalize('NFKC').replace(/\.pdf$/i, ''))
    // eslint-disable-next-line no-control-regex -- Control characters are invalid in filesystem filenames.
    .map((part) => part.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').replace(/\.{2,}/g, '.').trim())
    .filter(Boolean)
    .join(' - ')
    .replace(/^[. ]+|[. ]+$/g, '')
    .slice(0, 175)
    .trim();
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)) stem = `_${stem}`;
  return `${stem || 'document'}.pdf`;
}
