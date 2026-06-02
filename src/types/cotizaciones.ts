import type { PaginationParams } from "./common";

export interface SubcategoriaDispositivo {
  id: number;
  nombre: string;
  slug: string;
  activo: boolean;
  orden: number;
}

export interface CategoriaDispositivo {
  id: number;
  nombre: string;
  slug: string;
  activo: boolean;
  orden: number;
  subcategorias: SubcategoriaDispositivo[];
}

export interface FormulaReparacion {
  id: number;
  subcategoria: number | null;
  subcategoria_nombre: string | null;
  es_personalizado: boolean;
  multiplicador: string | null;
  incremento: string | null;
  expresion: string;
  activo?: boolean;
}

export interface TipoReparacion {
  id: number;
  nombre: string;
  activo: boolean;
  orden: number;
  categoria: number;
  categoria_nombre: string;
  // true si el tipo representa un servicio (mano de obra, liberación, calibración).
  // Items con tipo es_servicio=true se ignoran al auto-crear refacciones al autorizar.
  es_servicio: boolean;
  formulas: FormulaReparacion[];
}

export interface ResolverFormulaResponse {
  tiene_formula: boolean;
  es_personalizado: boolean;
  expresion: string;
  precio_base: string;
  precio_final: string | null;
  mensaje: string;
}

// Fórmula del endpoint /formulas/disponibles/ — viene deduplicada por el backend
export interface FormulaDisponible {
  formula_id: number;
  expresion: string;
  es_personalizado: boolean;
  multiplicador: string | null;
  incremento: string | null;
}

// FuenteApi dinámica (admin la configura)
export interface FuenteApi {
  id: number;
  slug: string;
  nombre: string;
  base_url: string;
  tipo_parser: string;
  activo: boolean;
  orden: number;
  notas: string;
}

// Referencia mínima embebida en productos y cotizacion_items
export interface FuenteApiRef {
  id: number;
  slug: string;
  nombre: string;
}

export interface ProductoApi {
  id: number;
  fuente: FuenteApiRef;
  producto_id_externo: string;
  titulo: string;
  precio: string;
  disponible: boolean;
  handle: string;
  vendor: string;
  product_type: string;
  url_producto: string;
  synced_at: string;
}

export type EstadoCotizacion = "borrador" | "finalizada" | "autorizada" | "cancelada";

export type RazonCancelacionCotizacion =
  | "cliente_cambio_opinion"
  | "cliente_sin_presupuesto"
  | "no_reparable"
  | "otro";

export interface CotizacionItem {
  id: number;
  cotizacion: number;
  tipo_reparacion: number;
  tipo_reparacion_nombre: string;
  subcategoria: number;
  subcategoria_nombre: string;
  es_manual: boolean;
  fuente_api: FuenteApiRef | null;
  producto_titulo: string;
  precio_base: string;
  precio_final: string;
  formula_snapshot: string;
  es_personalizado: boolean;
  link_referencia: string;
  disponible: boolean;
  cantidad: number;
  subtotal: string;
}

export interface CotizacionOrdenVinculada {
  id: number;
  numero_orden: string;
}

export interface Cotizacion {
  id: number;
  numero_cotizacion: string;
  nombre_cliente: string;
  notas: string;
  estado: EstadoCotizacion;
  total: string;
  items: CotizacionItem[];
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  created_by_nombre?: string | null;
  orden_vinculada?: CotizacionOrdenVinculada | null;
  autorizada_at?: string | null;
  autorizada_by?: number | null;
  autorizada_by_nombre?: string | null;
  cancelacion_razon?: RazonCancelacionCotizacion | null;
  cancelacion_razon_display?: string | null;
  cancelacion_notas?: string | null;
  cancelada_at?: string | null;
  cancelada_by?: number | null;
  cancelada_by_nombre?: string | null;
}

export interface CotizacionPayload {
  nombre_cliente?: string;
  cliente?: number;
  notas?: string;
}

export interface CotizacionItemPayload {
  tipo_reparacion_id: number;
  subcategoria_id: number;
  es_manual: boolean;
  fuente_api_id?: number | null;
  producto_titulo: string;
  precio_base: string;
  // En modo Manual el usuario elige la fórmula → se envía explícito (int o null).
  // En modo API se OMITE → el backend auto-resuelve por tipo+subcategoría.
  formula_id?: number | null;
  disponible?: boolean;
  cantidad?: number;
  precio_final_manual?: string;
  link_referencia?: string;
}

export interface CotizacionFilters extends PaginationParams {
  estado?: EstadoCotizacion;
  search?: string;
  anio?: number;
  mes?: number;
}

export interface ProductoApiFilters extends PaginationParams {
  q?: string;
  fuente?: string | number; // slug o id
  disponible?: boolean;
}

// ── Payloads para configuración (admin) ───────────────────────────

export interface CategoriaPayload {
  nombre: string;
  slug?: string;
  activo?: boolean;
  orden?: number;
}

export interface SubcategoriaPayload {
  categoria: number;
  nombre: string;
  slug?: string;
  activo?: boolean;
  orden?: number;
}

export interface TipoReparacionPayload {
  categoria: number;
  nombre: string;
  activo?: boolean;
  orden?: number;
  es_servicio?: boolean;
}

export interface FormulaPayload {
  tipo_reparacion: number;
  subcategoria?: number | null;
  es_personalizado: boolean;
  multiplicador?: string | null;
  incremento?: string | null;
  activo?: boolean;
}

// ── Payloads del flujo de autorización ────────────────────────────

import type { TipoDispositivo } from "./cliente";
import type { Orden } from "./orden";

export type AutorizarClienteModo = "vincular" | "crear" | "nombre_libre";
export type AdelantoTipo = "ninguno" | "personalizado" | "precio_piezas";

export interface AutorizarCotizacionPayload {
  cliente: {
    modo: AutorizarClienteModo;
    cliente_id: number | null;
    nombre: string;
    telefono: string | null;
  };
  dispositivo: {
    tipo: TipoDispositivo;
    marca: string;
    modelo: string;
    numero_serie: string | null;
    imei: string | null;
  };
  problema_reportado: string;
  detalles_equipo: {
    tiene_detalles: boolean;
    descripcion: string | null;
  };
  adelanto: {
    tipo: AdelantoTipo;
    monto: string | null;
  };
}

export interface RefaccionProcesada {
  id: number;
  nombre: string;
  cantidad: number;
  creada: boolean; // true si la refacción se creó en este flujo, false si se reusó
}

export interface AutorizarCotizacionResponse {
  cotizacion: Cotizacion;
  orden: Orden & {
    adelanto_calculo?: {
      precio_piezas_total: string;
      items_considerados: number;
    };
    refacciones_procesadas?: RefaccionProcesada[];
  };
}

export interface ReportarCancelacionPayload {
  razon: RazonCancelacionCotizacion;
  notas: string | null;
}

// Códigos de error 422 documentados por el backend.
export type AutorizarErrorCode =
  | "imei_invalido_para_tipo"
  | "detalles_descripcion_requerida"
  | "adelanto_inconsistente"
  | "adelanto_precio_piezas_mismatch"
  | "stock_insuficiente";

export interface RefaccionFaltante {
  refaccion_id: number;
  refaccion_nombre: string;
  stock_actual: number;
  stock_requerido: number;
  cotizacion_item_id: number;
}

export interface AutorizarErrorResponse {
  detail: string;
  code: AutorizarErrorCode;
  field?: string;
  // Para adelanto_precio_piezas_mismatch:
  monto_recibido?: string;
  monto_esperado?: string;
  // Para stock_insuficiente:
  refacciones_faltantes?: RefaccionFaltante[];
}
