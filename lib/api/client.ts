import axios, { type AxiosError } from "axios";

import { getAuthToken } from "@/lib/auth/token-storage";

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

function apiErrorFromPayload(
  data: unknown,
  status: number,
): ApiError | null {
  if (!isErrorPayload(data)) {
    return null;
  }
  return new ApiError(data.error.message, {
    status,
    code: data.error.code,
    details: data.error.details,
  });
}

export function getApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
}

/** React Native multipart via axios often fails; fetch handles FormData correctly. */
export async function apiMultipartRequest<TResponse>(
  path: string,
  form: FormData,
  opts?: { method?: "POST" | "PATCH"; timeoutMs?: number },
): Promise<TResponse> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError("EXPO_PUBLIC_API_BASE_URL is not set", {
      status: 0,
      code: "CONFIG",
      details: null,
    });
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;
  const token = await getAuthToken();
  const timeoutMs = opts?.timeoutMs ?? 120_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: opts?.method ?? "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
      signal: controller.signal,
    });
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      const fromPayload = apiErrorFromPayload(data, res.status);
      if (fromPayload) {
        throw fromPayload;
      }
      throw new ApiError(res.statusText || `HTTP ${res.status}`, {
        status: res.status,
        code: "HTTP_ERROR",
        details: data,
      });
    }
    return data as TResponse;
  } catch (e) {
    if (e instanceof ApiError) {
      throw e;
    }
    if (e instanceof Error && e.name === "AbortError") {
      throw new ApiError("Request timed out", {
        status: 0,
        code: "TIMEOUT",
        details: null,
      });
    }
    const msg = e instanceof Error ? e.message : "Network error";
    throw new ApiError(msg, {
      status: 0,
      code: "NETWORK_OR_UNKNOWN",
      details: null,
    });
  } finally {
    clearTimeout(timer);
  }
}

export const apiClient = axios.create({
  baseURL,
  timeout: 30_000,
});

function isPublicAuthPath(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return (
    url.includes("/auth/sign-in") ||
    url.includes("/auth/sign-up")
  );
}

apiClient.interceptors.request.use(async (config) => {
  if (config.data instanceof FormData) {
    config.timeout = Math.max(config.timeout ?? 0, 120_000);
    if (config.headers) {
      const h = config.headers as Record<string, unknown>;
      delete h["Content-Type"];
      delete h["content-type"];
    }
  }
  if (isPublicAuthPath(config.url)) {
    delete config.headers.Authorization;
    return config;
  }
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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
