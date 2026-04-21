import apiClient from "@/lib/axios";
import { ENDPOINTS } from "@/lib/config";
import type {
  Cliente, Dispositivo,
  ClientePayload, DispositivoPayload,
  PaginatedResponse, PaginationParams,
} from "@/types";

export const clientesApi = {
  list: (params?: PaginationParams & { search?: string }) =>
    apiClient.get<PaginatedResponse<Cliente>>(ENDPOINTS.clientes.list, { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Cliente>(ENDPOINTS.clientes.detail(id)).then((r) => r.data),

  create: (data: ClientePayload) =>
    apiClient.post<Cliente>(ENDPOINTS.clientes.list, data).then((r) => r.data),

  update: (id: number, data: Partial<ClientePayload>) =>
    apiClient.patch<Cliente>(ENDPOINTS.clientes.detail(id), data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(ENDPOINTS.clientes.detail(id)),

  dispositivos: {
    list: (params?: PaginationParams & { cliente?: number }) =>
      apiClient.get<PaginatedResponse<Dispositivo>>(ENDPOINTS.clientes.dispositivos.list, { params }).then((r) => r.data),

    get: (id: number) =>
      apiClient.get<Dispositivo>(ENDPOINTS.clientes.dispositivos.detail(id)).then((r) => r.data),

    create: (data: DispositivoPayload) =>
      apiClient.post<Dispositivo>(ENDPOINTS.clientes.dispositivos.list, data).then((r) => r.data),

    update: (id: number, data: Partial<DispositivoPayload>) =>
      apiClient.patch<Dispositivo>(ENDPOINTS.clientes.dispositivos.detail(id), data).then((r) => r.data),

    delete: (id: number) =>
      apiClient.delete(ENDPOINTS.clientes.dispositivos.detail(id)),
  },
};
