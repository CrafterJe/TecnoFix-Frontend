import type { TipoDispositivo } from "./cliente";
import type { PaginationParams } from "./common";
import type { FuenteApiRef } from "./cotizaciones";

export interface Refaccion {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  stock: number;
  stock_minimo: number;
  precio_costo: string;
  precio_venta: string;
  // Llenados cuando la refacción se crea desde el flujo de autorización de cotización.
  fuente_api?: FuenteApiRef | null;
  producto_id_externo?: string;
  // Calculado por el backend cuando se solicita en detalle.
  bajo_stock?: boolean;
  compatibilidades?: RefaccionCompatible[];
  created_at?: string;
  updated_at?: string;
}

export interface RefaccionPayload {
  nombre: string;
  descripcion?: string;
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

export interface CompatiblePayload {
  refaccion: number;
  marca: string;
  modelo: string;
  tipo_dispositivo: TipoDispositivo;
}

export interface InventarioFilters extends PaginationParams {
  search?: string;
  bajo_stock?: boolean;
}
