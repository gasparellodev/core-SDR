export function splitIntoChunks(text: string, maxSentences = 3): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const parts = normalized
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  const sentenceRegex = /[^.!?]+[.!?]+|[^.!?]+$/g;

  for (const part of parts) {
    const sentences = part.match(sentenceRegex) ?? [part];
    let buffer: string[] = [];
    for (const sentence of sentences) {
      buffer.push(sentence.trim());
      if (buffer.length >= maxSentences) {
        chunks.push(buffer.join(" ").trim());
        buffer = [];
      }
    }
    if (buffer.length) {
      chunks.push(buffer.join(" ").trim());
    }
  }

  return chunks.filter(Boolean);
}

export function appendLinkAsChunk(chunks: string[], link?: string): string[] {
  if (!link) return chunks;
  const trimmed = link.trim();
  if (!trimmed) return chunks;
  return [...chunks, trimmed];
}
