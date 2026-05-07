import { ApiError } from "@/lib/api/client";

export function mapAuthErrorToMessage(
  err: unknown,
  t: (key: string) => string,
): string {
  if (err instanceof ApiError) {
    if (err.code === "INVALID_CREDENTIALS") {
      return t("auth.errors.invalidCredentials");
    }
    if (err.code === "EMAIL_IN_USE") {
      return t("auth.errors.emailInUse");
    }
    if (err.code === "INVALID_BODY") {
      return t("auth.errors.invalidBody");
    }
    if (err.message) {
      return err.message;
    }
  }
  return t("auth.errors.generic");
}
