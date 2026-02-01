export function chunkText(input: { text: string; chunkSizeChars?: number; overlapChars?: number }) {
  const chunkSize = input.chunkSizeChars ?? 1200;
  const overlap = input.overlapChars ?? 200;

  const text = input.text.replace(/\s+/g, ' ').trim();
  const chunks: { text: string; chunkIndex: number }[] = [];

  let start = 0;
  let idx = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push({ text: chunk, chunkIndex: idx++ });
    }

    start = end - overlap;
    if (start < 0) start = 0;
    if (end === text.length) break;
  }

  return chunks;
}
