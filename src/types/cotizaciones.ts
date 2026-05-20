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

export type EstadoCotizacion = "borrador" | "finalizada" | "cancelada";

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
}

export interface FormulaPayload {
  tipo_reparacion: number;
  subcategoria?: number | null;
  es_personalizado: boolean;
  multiplicador?: string | null;
  incremento?: string | null;
  activo?: boolean;
}
