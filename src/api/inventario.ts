import apiClient from "@/lib/axios";
import { ENDPOINTS } from "@/lib/config";
import type {
  Refaccion, RefaccionCompatible,
  RefaccionPayload, CompatiblePayload,
  PaginatedResponse, PaginationParams,
} from "@/types";

export const inventarioApi = {
  list: (params?: PaginationParams & { search?: string; bajo_stock?: boolean }) =>
    apiClient.get<PaginatedResponse<Refaccion>>(ENDPOINTS.inventario.list, { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Refaccion>(ENDPOINTS.inventario.detail(id)).then((r) => r.data),

  create: (data: RefaccionPayload) =>
    apiClient.post<Refaccion>(ENDPOINTS.inventario.list, data).then((r) => r.data),

  update: (id: number, data: Partial<RefaccionPayload>) =>
    apiClient.patch<Refaccion>(ENDPOINTS.inventario.detail(id), data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(ENDPOINTS.inventario.detail(id)),

  ajustarStock: (id: number, cantidad: number, tipo: "entrada" | "salida") =>
    apiClient.post<Refaccion>(ENDPOINTS.inventario.ajustarStock(id), { cantidad, tipo }).then((r) => r.data),

  compatibles: {
    list: (params?: { refaccion?: number }) =>
      apiClient.get<PaginatedResponse<RefaccionCompatible>>(ENDPOINTS.inventario.compatibles.list, { params }).then((r) => r.data),

    create: (data: CompatiblePayload) =>
      apiClient.post<RefaccionCompatible>(ENDPOINTS.inventario.compatibles.list, data).then((r) => r.data),

    delete: (id: number) =>
      apiClient.delete(ENDPOINTS.inventario.compatibles.detail(id)),
  },
};
