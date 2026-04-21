import apiClient from "@/lib/axios";
import type { Refaccion, RefaccionCompatible, PaginatedResponse, PaginationParams } from "@/types";

interface RefaccionPayload {
  nombre: string;
  descripcion?: string;
  categoria: string;
  stock: number;
  stock_minimo: number;
  precio_costo: string;
  precio_venta: string;
}

interface CompatiblePayload {
  refaccion: number;
  marca: string;
  modelo: string;
  tipo_dispositivo: string;
}

export const inventarioApi = {
  list: (params?: PaginationParams & { search?: string; bajo_stock?: boolean }) =>
    apiClient.get<PaginatedResponse<Refaccion>>("/inventario/", { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Refaccion>(`/inventario/${id}/`).then((r) => r.data),

  create: (data: RefaccionPayload) =>
    apiClient.post<Refaccion>("/inventario/", data).then((r) => r.data),

  update: (id: number, data: Partial<RefaccionPayload>) =>
    apiClient.patch<Refaccion>(`/inventario/${id}/`, data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/inventario/${id}/`),

  ajustarStock: (id: number, cantidad: number, tipo: "entrada" | "salida") =>
    apiClient
      .post<Refaccion>(`/inventario/${id}/ajustar-stock/`, { cantidad, tipo })
      .then((r) => r.data),

  compatibles: {
    list: (params?: { refaccion?: number }) =>
      apiClient
        .get<PaginatedResponse<RefaccionCompatible>>("/inventario/compatibles/", { params })
        .then((r) => r.data),

    create: (data: CompatiblePayload) =>
      apiClient.post<RefaccionCompatible>("/inventario/compatibles/", data).then((r) => r.data),

    delete: (id: number) =>
      apiClient.delete(`/inventario/compatibles/${id}/`),
  },
};
