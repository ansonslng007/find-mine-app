import {
  documentDirectory,
  EncodingType,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

const DB_FILENAME = "image-embedding-db.json";

/** 供除錯／UI 顯示：檔案在**手機或模擬器**的 App 專屬目錄，不在電腦的 git 專案裡。 */
export function getEmbeddingDbFileUri(): string | null {
  const dir = documentDirectory;
  if (!dir) return null;
  return `${dir}${DB_FILENAME}`;
}

export interface ImageLabelPrediction {
  className: string;
  probability: number;
}

/** 單筆上傳記錄：MobileNet 嵌入向量 + ImageNet 風格類別預測，供日後相似度比對 */
export interface ImageEmbeddingRecord {
  id: string;
  createdAt: string;
  featureVector: number[];
  labelPredictions: ImageLabelPrediction[];
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function loadAllRecords(): Promise<ImageEmbeddingRecord[]> {
  const dir = documentDirectory;
  if (!dir) return [];
  const path = `${dir}${DB_FILENAME}`;
  const info = await getInfoAsync(path);
  if (!info.exists) return [];
  try {
    const content = await readAsStringAsync(path);
    const parsed = JSON.parse(content) as unknown;
    return Array.isArray(parsed) ? (parsed as ImageEmbeddingRecord[]) : [];
  } catch {
    return [];
  }
}

export async function appendRecord(
  partial: Omit<ImageEmbeddingRecord, "id" | "createdAt"> &
    Partial<Pick<ImageEmbeddingRecord, "id" | "createdAt">>,
): Promise<ImageEmbeddingRecord> {
  const record: ImageEmbeddingRecord = {
    id: partial.id ?? newId(),
    createdAt: partial.createdAt ?? new Date().toISOString(),
    featureVector: partial.featureVector,
    labelPredictions: partial.labelPredictions,
  };

  const all = await loadAllRecords();
  all.push(record);

  const dir = documentDirectory;
  if (!dir) {
    throw new Error("無法寫入：未取得 documentDirectory");
  }
  const path = `${dir}${DB_FILENAME}`;
  const payload = JSON.stringify(all, null, 2);
  await writeAsStringAsync(path, payload, {
    encoding: EncodingType.UTF8,
  });

  if (__DEV__) {
    console.log(
      `[image-embedding-db] 已寫入 ${all.length} 筆 → ${path}（僅存在於本機 App 沙盒）`,
    );
  }

  return record;
}

export async function getRecordCount(): Promise<number> {
  const all = await loadAllRecords();
  return all.length;
}
