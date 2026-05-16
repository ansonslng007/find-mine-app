const FB_IMPORT_MARKER = /\[社團貼文匯入·實驗 · [^\]]+\]/;

/** Fallback when API has no sourcePostUrl (legacy imports). */
export function parseFbImportPostUrl(
  description: string | null | undefined,
): string | null {
  if (!description?.trim()) return null;
  if (!FB_IMPORT_MARKER.test(description)) return null;
  for (const line of description.split("\n")) {
    const t = line.trim();
    if (/^https?:\/\/(www\.)?facebook\.com\//i.test(t)) {
      return t;
    }
  }
  return null;
}

export function resolveFbSourcePostUrl(item: {
  sourcePostUrl?: string | null;
  description?: string | null;
}): string | null {
  const fromApi = item.sourcePostUrl?.trim();
  if (fromApi) return fromApi;
  return parseFbImportPostUrl(item.description);
}
