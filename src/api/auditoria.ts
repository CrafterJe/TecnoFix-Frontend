import apiClient from "@/lib/axios";
import { ENDPOINTS } from "@/lib/config";
import type { AuditLog, AuditoriaFilters, PaginatedResponse } from "@/types";

export const auditoriaApi = {
  list: (params?: AuditoriaFilters) =>
    apiClient.get<PaginatedResponse<AuditLog>>(ENDPOINTS.auditoria.list, { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<AuditLog>(ENDPOINTS.auditoria.detail(id)).then((r) => r.data),
};
