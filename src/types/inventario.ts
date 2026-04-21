import type { TipoDispositivo } from "./cliente";
import type { PaginationParams } from "./common";

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
