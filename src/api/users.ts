import apiClient from "@/lib/axios";
import { ENDPOINTS } from "@/lib/config";
import type { User, UserPayload, Tecnico, PaginatedResponse, PaginationParams } from "@/types";

export const usersApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<User>>(ENDPOINTS.users.list, { params }).then((r) => r.data),

  // Lista ligera de técnicos activos, accesible a cualquier rol autenticado.
  // Respuesta: array directo [{ id, nombre }] (no paginado).
  tecnicos: () =>
    apiClient.get<Tecnico[]>(ENDPOINTS.users.tecnicos).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<User>(ENDPOINTS.users.detail(id)).then((r) => r.data),

  create: (data: UserPayload) =>
    apiClient.post<User>(ENDPOINTS.users.list, data).then((r) => r.data),

  update: (id: number, data: Partial<UserPayload>) =>
    apiClient.patch<User>(ENDPOINTS.users.detail(id), data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(ENDPOINTS.users.detail(id)),

  resetPassword: (id: number, data: { password: string; password_confirm: string }) =>
    apiClient.post(ENDPOINTS.users.resetPassword(id), data),

  cambiarPasswordPropio: (id: number, data: { password_actual: string; password_nuevo: string; password_nuevo_confirm: string }) =>
    apiClient.post<{ detail: string; access: string; refresh: string }>(ENDPOINTS.users.cambiarPasswordPropio(id), data).then((r) => r.data),

  activar: (id: number) =>
    apiClient.post<User>(ENDPOINTS.users.activar(id)).then((r) => r.data),

  desactivar: (id: number) =>
    apiClient.post<User>(ENDPOINTS.users.desactivar(id)).then((r) => r.data),
};
