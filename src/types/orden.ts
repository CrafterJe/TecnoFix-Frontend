import type { User } from "./user";
import type { Dispositivo } from "./cliente";
import type { PaginationParams } from "./common";
import type { Refaccion } from "./inventario";

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

export interface OrdenPayload {
  dispositivo: number;
  problema_reportado: string;
}

export interface OrdenUpdatePayload {
  diagnostico?: string;
  costo_estimado?: string;
  costo_final?: string;
}

export interface OrdenFilters extends PaginationParams {
  estado?: EstadoOrden;
  assigned_to?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  search?: string;
}

export type TipoEvidencia = "recepcion" | "proceso" | "entrega";

export interface Evidencia {
  id: number;
  orden: number;
  imagen: string;
  tipo: TipoEvidencia;
  uploaded_by: User | null;
}

export interface OrdenRefaccion {
  id: number;
  orden: number;
  refaccion: Refaccion;
  cantidad: number;
  added_by: User | null;
}

