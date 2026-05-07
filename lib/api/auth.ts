import { apiClient } from "@/lib/api/client";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  biometricLoginEnabled: boolean;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export async function signUp(input: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/v1/auth/sign-up", {
    email: input.email.trim(),
    password: input.password,
    ...(input.fullName !== undefined && input.fullName.trim() !== ""
      ? { fullName: input.fullName.trim() }
      : {}),
  });
  return data;
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/v1/auth/sign-in", {
    email: input.email.trim(),
    password: input.password,
  });
  return data;
}

export async function getMe(): Promise<{ user: AuthUser }> {
  const { data } = await apiClient.get<{ user: AuthUser }>("/api/v1/auth/me");
  return data;
}

export async function patchMe(input: {
  biometricLoginEnabled: boolean;
}): Promise<{ user: AuthUser }> {
  const { data } = await apiClient.patch<{ user: AuthUser }>(
    "/api/v1/auth/me",
    { biometricLoginEnabled: input.biometricLoginEnabled },
  );
  return data;
}
