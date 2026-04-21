import apiClient from "@/lib/axios";
import type { AuthResponse } from "@/types";

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>("/users/auth/login/", { email, password }).then((r) => r.data),

  refresh: (refresh: string) =>
    apiClient.post<{ access: string }>("/users/auth/refresh/", { refresh }).then((r) => r.data),
};
