import apiClient from "@/lib/axios";
import type { Orden, Evidencia, OrdenRefaccion, PaginatedResponse, PaginationParams, EstadoOrden } from "@/types";

interface OrdenPayload {
  dispositivo: number;
  problema_reportado: string;
}

interface OrdenFilters extends PaginationParams {
  estado?: EstadoOrden;
  assigned_to?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  search?: string;
}

export const ordenesApi = {
  list: (params?: OrdenFilters) =>
    apiClient.get<PaginatedResponse<Orden>>("/ordenes/", { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Orden>(`/ordenes/${id}/`).then((r) => r.data),

  create: (data: OrdenPayload) =>
    apiClient.post<Orden>("/ordenes/", data).then((r) => r.data),

  update: (id: number, data: Partial<OrdenPayload> & { diagnostico?: string; costo_estimado?: string; costo_final?: string }) =>
    apiClient.patch<Orden>(`/ordenes/${id}/`, data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/ordenes/${id}/`),

  cambiarEstado: (id: number, estado: EstadoOrden) =>
    apiClient.post<Orden>(`/ordenes/${id}/cambiar-estado/`, { estado }).then((r) => r.data),

  asignarTecnico: (id: number, tecnico_id: number) =>
    apiClient.post<Orden>(`/ordenes/${id}/asignar-tecnico/`, { tecnico_id }).then((r) => r.data),

  agregarRefaccion: (id: number, refaccion_id: number, cantidad: number) =>
    apiClient
      .post<OrdenRefaccion>(`/ordenes/${id}/agregar-refaccion/`, { refaccion_id, cantidad })
      .then((r) => r.data),

  evidencias: {
    list: (params?: { orden?: number }) =>
      apiClient.get<PaginatedResponse<Evidencia>>("/ordenes/evidencias/", { params }).then((r) => r.data),

    create: (data: FormData) =>
      apiClient
        .post<Evidencia>("/ordenes/evidencias/", data, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data),

    delete: (id: number) =>
      apiClient.delete(`/ordenes/evidencias/${id}/`),
  },
};
