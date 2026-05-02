import type { MobileNet } from "@tensorflow-models/mobilenet";
import * as ImageManipulator from "expo-image-manipulator";
import {
  EncodingType,
  readAsStringAsync,
} from "expo-file-system/legacy";

export type MobilenetRawPrediction = {
  className: string;
  probability: number;
};

let modelRef: MobileNet | null = null;

function base64ToUint8Array(base64: string): Uint8Array {
  const g = globalThis as typeof globalThis & { atob?: (s: string) => string };
  const atobFn = g.atob;
  if (!atobFn) {
    throw new Error("atob 不可用，無法解碼圖片");
  }
  const binary = atobFn(base64);
  const len = binary.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/** iOS / Android：初始化 RN WebGL 後端並載入 MobileNet。 */
export async function initMobilenet(): Promise<boolean> {
  await import("@tridipdas13/tfjs-react-native");
  const tf = await import("@tensorflow/tfjs");
  await tf.ready();
  await tf.setBackend("rn-webgl");
  await tf.ready();

  const mobilenet = await import("@tensorflow-models/mobilenet");
  modelRef = await mobilenet.load();
  return true;
}

export function disposeMobilenet(): void {
  if (modelRef && "dispose" in modelRef) {
    (modelRef as { dispose: () => void }).dispose();
  }
  modelRef = null;
}

/**
 * 將相簿 URI 轉成 JPEG 位元組後解碼為張量，再分類與取嵌入向量。
 * 呼叫前須已成功執行 initMobilenet。
 */
export async function classifyImageFromUri(uri: string): Promise<{
  rawPredictions: MobilenetRawPrediction[];
  featureVector: number[];
}> {
  if (!modelRef) {
    throw new Error("模型尚未載入");
  }

  const { decodeJpeg } = await import("@tridipdas13/tfjs-react-native");

  const { uri: jpegUri } = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 0.92,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const base64 = await readAsStringAsync(jpegUri, {
    encoding: EncodingType.Base64,
  });
  const jpegBytes = base64ToUint8Array(base64);
  const imageTensor = decodeJpeg(jpegBytes, 3);

  try {
    const results = await modelRef.classify(imageTensor);
    const embeddingTensor = modelRef.infer(imageTensor, true);
    let featureVector: number[];
    try {
      const raw = await embeddingTensor.data();
      featureVector = Array.from(raw);
    } finally {
      embeddingTensor.dispose();
    }
    return { rawPredictions: results, featureVector };
  } finally {
    imageTensor.dispose();
  }
}
