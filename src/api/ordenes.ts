import apiClient from "@/lib/axios";
import { ENDPOINTS } from "@/lib/config";
import type {
  Orden, Evidencia, OrdenRefaccion,
  OrdenPayload, OrdenUpdatePayload, OrdenFilters,
  PaginatedResponse,
} from "@/types";

export const ordenesApi = {
  list: (params?: OrdenFilters) =>
    apiClient.get<PaginatedResponse<Orden>>(ENDPOINTS.ordenes.list, { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Orden>(ENDPOINTS.ordenes.detail(id)).then((r) => r.data),

  create: (data: OrdenPayload) =>
    apiClient.post<Orden>(ENDPOINTS.ordenes.list, data).then((r) => r.data),

  update: (id: number, data: Partial<OrdenPayload> & OrdenUpdatePayload) =>
    apiClient.patch<Orden>(ENDPOINTS.ordenes.detail(id), data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(ENDPOINTS.ordenes.detail(id)),

  cambiarEstado: (id: number, estado: string) =>
    apiClient.post<Orden>(ENDPOINTS.ordenes.cambiarEstado(id), { estado }).then((r) => r.data),

  asignarTecnico: (id: number, tecnico_id: number) =>
    apiClient.post<Orden>(ENDPOINTS.ordenes.asignarTecnico(id), { tecnico_id }).then((r) => r.data),

  agregarRefaccion: (id: number, refaccion_id: number, cantidad: number) =>
    apiClient.post<OrdenRefaccion>(ENDPOINTS.ordenes.agregarRefaccion(id), { refaccion_id, cantidad }).then((r) => r.data),

  evidencias: {
    list: (params?: { orden?: number }) =>
      apiClient.get<PaginatedResponse<Evidencia>>(ENDPOINTS.ordenes.evidencias.list, { params }).then((r) => r.data),

    create: (data: FormData) =>
      apiClient.post<Evidencia>(ENDPOINTS.ordenes.evidencias.list, data, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data),

    delete: (id: number) =>
      apiClient.delete(ENDPOINTS.ordenes.evidencias.detail(id)),
  },
};
