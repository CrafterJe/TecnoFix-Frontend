import apiClient from "@/lib/axios";
import type { AuditLog, PaginatedResponse, PaginationParams, AuditAction } from "@/types";

interface AuditoriaFilters extends PaginationParams {
  entity?: string;
  action?: AuditAction;
  user?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export const auditoriaApi = {
  list: (params?: AuditoriaFilters) =>
    apiClient.get<PaginatedResponse<AuditLog>>("/auditoria/", { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<AuditLog>(`/auditoria/${id}/`).then((r) => r.data),
};
