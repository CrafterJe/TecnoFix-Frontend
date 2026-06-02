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

export type AdelantoTipoOrden = "ninguno" | "personalizado" | "precio_piezas";

export interface OrdenCotizacionRef {
  id: number;
  numero_cotizacion: string;
}

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
  // Campos agregados por el flujo de autorización de cotización.
  cotizacion?: OrdenCotizacionRef | null;
  numero_serie?: string;
  imei?: string;
  detalles_tiene?: boolean;
  detalles_descripcion?: string;
  adelanto_tipo?: AdelantoTipoOrden;
  adelanto_tipo_display?: string;
  adelanto_monto?: string | null;
  // Lista anidada de refacciones vinculadas a la orden. El backend debe
  // exponerla en el GET (DRF nested serializer o source="ordenrefaccion_set").
  refacciones?: OrdenRefaccion[];
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
  // Atajos por compatibilidad: cuando solo se necesita el id/nombre sin entrar al objeto.
  refaccion_id: number;
  refaccion_nombre: string;
  cantidad: number;
  added_by: User | null;
  added_by_nombre: string | null;
  created_at: string;
}

