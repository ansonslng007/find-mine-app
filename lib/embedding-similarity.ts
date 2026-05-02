import type { ImageEmbeddingRecord } from "@/lib/image-embedding-db";

/**
 * 與「同一張圖」在嵌入空間的餘弦相似度通常極接近 1（浮點誤差下可能略小）。
 * 達此門檻視為 100% 相同，不重复 append。
 */
export const EMBEDDING_EXACT_MATCH_MIN_COSINE = 0.9999;

/** 列出「相近圖片」時的最低餘弦相似度（0.8 = 80%）。 */
export const SIMILAR_NEIGHBOR_MIN_COSINE = 0.8;

/** 餘弦相似度，範圍約 [-1, 1]；維度不符或空向量回傳 0。 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom < 1e-12) {
    return 0;
  }
  return dot / denom;
}

/** 與 query 嵌入「視為完全相同」的既有紀錄（可有多筆重複存檔時）。 */
export function findEmbeddingDuplicates(
  query: number[],
  records: ImageEmbeddingRecord[],
  minCosine: number = EMBEDDING_EXACT_MATCH_MIN_COSINE,
): ImageEmbeddingRecord[] {
  const qLen = query.length;
  return records.filter(
    (r) =>
      r.featureVector.length === qLen &&
      cosineSimilarity(query, r.featureVector) >= minCosine,
  );
}

/**
 * 依餘弦相似度由高到低，只保留 similarity ≥ minCosine 的紀錄，再取前 k 筆。
 * 可排除某一 id（例如剛新增的紀錄）。
 */
export function topKSimilarRecords(
  query: number[],
  records: ImageEmbeddingRecord[],
  k: number,
  excludeId?: string | null,
  minCosine: number = SIMILAR_NEIGHBOR_MIN_COSINE,
): Array<{ record: ImageEmbeddingRecord; similarity: number }> {
  const qLen = query.length;
  const scored = records
    .filter(
      (r) =>
        r.id !== excludeId &&
        r.featureVector.length === qLen &&
        r.featureVector.length > 0,
    )
    .map((r) => ({
      record: r,
      similarity: cosineSimilarity(query, r.featureVector),
    }))
    .sort((x, y) => y.similarity - x.similarity)
    .filter((x) => x.similarity >= minCosine);

  return scored.slice(0, Math.max(0, k));
}
