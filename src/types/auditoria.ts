import type { User } from "./user";
import type { PaginationParams } from "./common";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ASSIGN"
  | "STATUS_CHANGE"
  | "LOGIN";

export interface AuditLog {
  id: number;
  user: User | null;
  user_nombre: string;
  action: AuditAction;
  action_display: string;
  entity: string;
  entity_id: number;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string;
  created_at: string;
}

export interface AuditoriaFilters extends PaginationParams {
  entity?: string;
  action?: AuditAction;
  user?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
}
