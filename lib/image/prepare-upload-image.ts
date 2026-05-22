import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;

export type PreparedUploadImage = {
  uri: string;
  mime: string;
  name: string;
};

function isAppCacheUri(uri: string): boolean {
  const cache = FileSystem.cacheDirectory;
  if (cache && uri.startsWith(cache)) {
    return true;
  }
  const doc = FileSystem.documentDirectory;
  if (doc && uri.startsWith(doc)) {
    return true;
  }
  return false;
}

/** Gallery on Android often returns content:// or shared-storage file:// URIs that multipart cannot read. */
function shouldCopyToAppCache(uri: string): boolean {
  const lower = uri.toLowerCase();
  if (
    lower.startsWith("content://") ||
    lower.startsWith("ph://") ||
    lower.startsWith("assets-library://")
  ) {
    return true;
  }
  if (Platform.OS === "android" && lower.startsWith("file://") && !isAppCacheUri(uri)) {
    return true;
  }
  return false;
}

async function resolveReadableImageUri(uri: string): Promise<{
  uri: string;
  tempPath: string | null;
}> {
  if (!shouldCopyToAppCache(uri)) {
    return { uri, tempPath: null };
  }
  const dest = `${FileSystem.cacheDirectory ?? ""}upload-src-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return { uri: dest, tempPath: dest };
}

/** Resize and encode as JPEG so multipart uploads work reliably on Android. */
export async function prepareImageForUpload(
  uri: string,
  _mime?: string,
): Promise<PreparedUploadImage> {
  const { uri: readableUri, tempPath } = await resolveReadableImageUri(uri);
  try {
    const result = await ImageManipulator.manipulateAsync(
      readableUri,
      [{ resize: { width: MAX_EDGE_PX } }],
      {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    return {
      uri: result.uri,
      mime: "image/jpeg",
      name: "upload.jpg",
    };
  } finally {
    if (tempPath) {
      try {
        await FileSystem.deleteAsync(tempPath, { idempotent: true });
      } catch {
        /* ignore cleanup errors */
      }
    }
  }
}