/**
 * Socket.IO expects origin only (protocol + host), no path prefix.
 */
export function getSocketBaseUrl(): string {
  const fromEnv =
    (typeof process !== "undefined" &&
      process.env.EXPO_PUBLIC_WS_BASE_URL?.trim()) ||
    (typeof process !== "undefined" &&
      process.env.EXPO_PUBLIC_API_BASE_URL?.trim()) ||
    "";
  if (!fromEnv) {
    return "";
  }
  try {
    const u = new URL(fromEnv);
    return `${u.protocol}//${u.host}`;
  } catch {
    return fromEnv.replace(/\/+$/, "");
  }
}
