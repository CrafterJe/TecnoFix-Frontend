import apiClient from "@/lib/axios";
import type { Cliente, Dispositivo, PaginatedResponse, PaginationParams } from "@/types";

interface ClientePayload {
  nombre: string;
  telefono: string;
  email?: string;
}

interface DispositivoPayload {
  cliente: number;
  tipo: string;
  marca: string;
  modelo: string;
}

export const clientesApi = {
  list: (params?: PaginationParams & { search?: string }) =>
    apiClient.get<PaginatedResponse<Cliente>>("/clientes/", { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Cliente>(`/clientes/${id}/`).then((r) => r.data),

  create: (data: ClientePayload) =>
    apiClient.post<Cliente>("/clientes/", data).then((r) => r.data),

  update: (id: number, data: Partial<ClientePayload>) =>
    apiClient.patch<Cliente>(`/clientes/${id}/`, data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/clientes/${id}/`),

  dispositivos: {
    list: (params?: PaginationParams & { cliente?: number }) =>
      apiClient
        .get<PaginatedResponse<Dispositivo>>("/clientes/dispositivos/", { params })
        .then((r) => r.data),

    get: (id: number) =>
      apiClient.get<Dispositivo>(`/clientes/dispositivos/${id}/`).then((r) => r.data),

    create: (data: DispositivoPayload) =>
      apiClient.post<Dispositivo>("/clientes/dispositivos/", data).then((r) => r.data),

    update: (id: number, data: Partial<DispositivoPayload>) =>
      apiClient.patch<Dispositivo>(`/clientes/dispositivos/${id}/`, data).then((r) => r.data),

    delete: (id: number) =>
      apiClient.delete(`/clientes/dispositivos/${id}/`),
  },
};
