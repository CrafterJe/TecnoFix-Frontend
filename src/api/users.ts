import apiClient from "@/lib/axios";
import type { User, PaginatedResponse, PaginationParams } from "@/types";

interface UserPayload {
  nombre: string;
  email: string;
  rol: string;
  password?: string;
}

export const usersApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<User>>("/users/", { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<User>(`/users/${id}/`).then((r) => r.data),

  create: (data: UserPayload) =>
    apiClient.post<User>("/users/", data).then((r) => r.data),

  update: (id: number, data: Partial<UserPayload>) =>
    apiClient.patch<User>(`/users/${id}/`, data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/users/${id}/`),

  cambiarPassword: (id: number, password: string) =>
    apiClient.post(`/users/${id}/cambiar-password/`, { password }),

  activar: (id: number) =>
    apiClient.post<User>(`/users/${id}/activar/`).then((r) => r.data),

  desactivar: (id: number) =>
    apiClient.post<User>(`/users/${id}/desactivar/`).then((r) => r.data),
};
