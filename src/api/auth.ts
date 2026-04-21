import apiClient from "@/lib/axios";
import { ENDPOINTS } from "@/lib/config";
import type { AuthResponse } from "@/types";

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>(ENDPOINTS.auth.login, { email, password }).then((r) => r.data),

  refresh: (refresh: string) =>
    apiClient.post<{ access: string }>(ENDPOINTS.auth.refresh, { refresh }).then((r) => r.data),

  passwordReset: (email: string) =>
    apiClient.post(ENDPOINTS.auth.passwordReset, { email }).then((r) => r.data),
};
