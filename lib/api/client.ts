import axios, { type AxiosError } from "axios";

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(
    message: string,
    opts: { status: number; code: string; details?: unknown },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details ?? null;
  }
}

function isErrorPayload(data: unknown): data is {
  error: { code: string; message: string; details?: unknown };
} {
  if (!data || typeof data !== "object") return false;
  const err = (data as { error?: unknown }).error;
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; message?: unknown };
  return typeof e.code === "string" && typeof e.message === "string";
}

export const apiClient = axios.create({
  baseURL,
  timeout: 30_000,
});

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<unknown>) => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;
    if (isErrorPayload(data)) {
      return Promise.reject(
        new ApiError(data.error.message, {
          status,
          code: data.error.code,
          details: data.error.details,
        }),
      );
    }
    const msg = error.message || "Network error";
    return Promise.reject(
      new ApiError(msg, { status, code: "NETWORK_OR_UNKNOWN", details: null }),
    );
  },
);
