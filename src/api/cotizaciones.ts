import apiClient from "@/lib/axios";
import { ENDPOINTS } from "@/lib/config";
import type {
  Cotizacion, CotizacionPayload, CotizacionFilters,
  CotizacionItem, CotizacionItemPayload,
  CategoriaDispositivo, CategoriaPayload,
  SubcategoriaDispositivo, SubcategoriaPayload,
  TipoReparacion, TipoReparacionPayload,
  FormulaReparacion, FormulaPayload, FormulaDisponible,
  FuenteApi,
  ProductoApi, ProductoApiFilters, ResolverFormulaResponse,
  EstadoCotizacion, PaginatedResponse,
} from "@/types";

function extractList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.results)) return obj.results as T[];
  }
  return [];
}

async function getList<T>(url: string, params?: Record<string, unknown>): Promise<T[]> {
  const { data } = await apiClient.get(url, { params });
  return extractList<T>(data);
}

export const cotizacionesApi = {
  list: (params?: CotizacionFilters) =>
    apiClient
      .get<PaginatedResponse<Cotizacion>>(ENDPOINTS.cotizaciones.list, { params })
      .then((r) => r.data),

  get: (id: number) =>
    apiClient
      .get<Cotizacion>(ENDPOINTS.cotizaciones.detail(id))
      .then((r) => r.data),

  create: (data: CotizacionPayload) =>
    apiClient
      .post<Cotizacion>(ENDPOINTS.cotizaciones.list, data)
      .then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(ENDPOINTS.cotizaciones.detail(id)),

  cambiarEstado: (id: number, estado: EstadoCotizacion) =>
    apiClient
      .post<Cotizacion>(ENDPOINTS.cotizaciones.cambiarEstado(id), { estado })
      .then((r) => r.data),

  items: {
    add: (cotizacionId: number, data: CotizacionItemPayload) =>
      apiClient
        .post<CotizacionItem>(ENDPOINTS.cotizaciones.items(cotizacionId), data)
        .then((r) => r.data),

    remove: (cotizacionId: number, itemId: number) =>
      apiClient.delete(ENDPOINTS.cotizaciones.itemDetail(cotizacionId, itemId)),
  },

  categorias: {
    list: () => getList<CategoriaDispositivo>(ENDPOINTS.cotizaciones.categorias),

    create: (data: CategoriaPayload) =>
      apiClient
        .post<CategoriaDispositivo>(ENDPOINTS.cotizaciones.categorias, data)
        .then((r) => r.data),

    update: (id: number, data: Partial<CategoriaPayload>) =>
      apiClient
        .patch<CategoriaDispositivo>(ENDPOINTS.cotizaciones.categoriaDetail(id), data)
        .then((r) => r.data),

    delete: (id: number) =>
      apiClient.delete(ENDPOINTS.cotizaciones.categoriaDetail(id)),

    reorder: (ids: number[]) =>
      apiClient
        .post<CategoriaDispositivo[]>(ENDPOINTS.cotizaciones.categoriasReorder, { ids })
        .then((r) => r.data),
  },

  subcategorias: {
    list: (categoriaId?: number) =>
      getList<SubcategoriaDispositivo>(
        ENDPOINTS.cotizaciones.subcategorias,
        categoriaId ? { categoria: categoriaId } : undefined
      ),

    create: (data: SubcategoriaPayload) =>
      apiClient
        .post<SubcategoriaDispositivo>(ENDPOINTS.cotizaciones.subcategorias, data)
        .then((r) => r.data),

    update: (id: number, data: Partial<SubcategoriaPayload>) =>
      apiClient
        .patch<SubcategoriaDispositivo>(ENDPOINTS.cotizaciones.subcategoriaDetail(id), data)
        .then((r) => r.data),

    delete: (id: number) =>
      apiClient.delete(ENDPOINTS.cotizaciones.subcategoriaDetail(id)),

    reorder: (categoriaId: number, ids: number[]) =>
      apiClient
        .post<SubcategoriaDispositivo[]>(ENDPOINTS.cotizaciones.subcategoriasReorder, {
          categoria_id: categoriaId,
          ids,
        })
        .then((r) => r.data),
  },

  tiposReparacion: {
    list: (categoriaId?: number) =>
      getList<TipoReparacion>(
        ENDPOINTS.cotizaciones.tiposReparacion,
        categoriaId ? { categoria: categoriaId } : undefined
      ),

    create: (data: TipoReparacionPayload) =>
      apiClient
        .post<TipoReparacion>(ENDPOINTS.cotizaciones.tiposReparacion, data)
        .then((r) => r.data),

    update: (id: number, data: Partial<TipoReparacionPayload>) =>
      apiClient
        .patch<TipoReparacion>(ENDPOINTS.cotizaciones.tipoReparacionDetail(id), data)
        .then((r) => r.data),

    delete: (id: number) =>
      apiClient.delete(ENDPOINTS.cotizaciones.tipoReparacionDetail(id)),

    reorder: (categoriaId: number, ids: number[]) =>
      apiClient
        .post<TipoReparacion[]>(ENDPOINTS.cotizaciones.tiposReparacionReorder, {
          categoria_id: categoriaId,
          ids,
        })
        .then((r) => r.data),
  },

  formulas: {
    list: (tipoReparacionId?: number) =>
      getList<FormulaReparacion>(
        ENDPOINTS.cotizaciones.formulas,
        tipoReparacionId ? { tipo_reparacion: tipoReparacionId } : undefined
      ),

    create: (data: FormulaPayload) =>
      apiClient
        .post<FormulaReparacion>(ENDPOINTS.cotizaciones.formulas, data)
        .then((r) => r.data),

    update: (id: number, data: Partial<FormulaPayload>) =>
      apiClient
        .patch<FormulaReparacion>(ENDPOINTS.cotizaciones.formulaDetail(id), data)
        .then((r) => r.data),

    delete: (id: number) =>
      apiClient.delete(ENDPOINTS.cotizaciones.formulaDetail(id)),

    // Fórmulas únicas deduplicadas por el backend, para el selector del wizard.
    // No es paginado: viene como array directo.
    disponibles: async () => {
      const { data } = await apiClient.get(ENDPOINTS.cotizaciones.formulasDisponibles);
      return extractList<FormulaDisponible>(data);
    },
  },

  fuentesApi: {
    // Solo lectura desde el front. La gestión completa (CRUD) se hace
    // desde Django admin en /admin/cotizaciones/fuenteapi/.
    list: (params?: { activo?: boolean }) =>
      getList<FuenteApi>(ENDPOINTS.cotizaciones.fuentesApi, params),
  },

  productosApi: {
    list: (params?: ProductoApiFilters) =>
      apiClient
        .get<PaginatedResponse<ProductoApi>>(ENDPOINTS.cotizaciones.productosApi, { params })
        .then((r) => r.data),
  },

  resolverFormula: (params: {
    tipo_reparacion: number;
    subcategoria: number;
    precio_base: string | number;
  }) =>
    apiClient
      .get<ResolverFormulaResponse>(ENDPOINTS.cotizaciones.resolverFormula, { params })
      .then((r) => r.data),

  pdf: async (id: number, tipo: "cliente" | "empresa") => {
    const endpoint =
      tipo === "cliente"
        ? ENDPOINTS.cotizaciones.pdfCliente(id)
        : ENDPOINTS.cotizaciones.pdfEmpresa(id);
    const response = await apiClient.get(endpoint, { responseType: "blob" });
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  },
};
