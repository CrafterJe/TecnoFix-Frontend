export type UserRole = "admin" | "tecnico" | "recepcion";

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
  activo: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  created_at: string;
}

export type TipoDispositivo =
  | "celular"
  | "tablet"
  | "laptop"
  | "computadora"
  | "otro";

export interface Dispositivo {
  id: number;
  cliente: { id: number; nombre: string };
  tipo: TipoDispositivo;
  marca: string;
  modelo: string;
}

export type EstadoOrden =
  | "recibido"
  | "diagnostico"
  | "esperando_refaccion"
  | "en_reparacion"
  | "listo"
  | "entregado";

export interface Orden {
  id: number;
  numero_orden: string;
  dispositivo: Dispositivo;
  problema_reportado: string;
  diagnostico: string | null;
  estado: EstadoOrden;
  costo_estimado: string | null;
  costo_final: string | null;
  created_by: User | null;
  received_by: User | null;
  assigned_to: User | null;
  delivered_by: User | null;
  created_at: string;
  updated_at: string;
}

export type TipoEvidencia = "recepcion" | "proceso" | "entrega";

export interface Evidencia {
  id: number;
  orden: number;
  imagen: string;
  tipo: TipoEvidencia;
  uploaded_by: User | null;
}

export interface Refaccion {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  stock: number;
  stock_minimo: number;
  precio_costo: string;
  precio_venta: string;
}

export interface RefaccionCompatible {
  id: number;
  refaccion: number;
  marca: string;
  modelo: string;
  tipo_dispositivo: TipoDispositivo;
}

export interface OrdenRefaccion {
  id: number;
  orden: number;
  refaccion: Refaccion;
  cantidad: number;
  added_by: User | null;
}

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
  action: AuditAction;
  entity: string;
  entity_id: number;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}
