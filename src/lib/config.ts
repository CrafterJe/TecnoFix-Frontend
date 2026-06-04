export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const ENDPOINTS = {
  auth: {
    login: "/users/auth/login/",
    refresh: "/users/auth/refresh/",
    passwordReset: "/users/auth/password-reset/",
  },
  clientes: {
    list: "/clientes/",
    detail: (id: number) => `/clientes/${id}/`,
    dispositivos: {
      list: "/clientes/dispositivos/",
      detail: (id: number) => `/clientes/dispositivos/${id}/`,
    },
  },
  ordenes: {
    list: "/ordenes/",
    detail: (id: number) => `/ordenes/${id}/`,
    cambiarEstado: (id: number) => `/ordenes/${id}/cambiar-estado/`,
    asignarTecnico: (id: number) => `/ordenes/${id}/asignar-tecnico/`,
    agregarRefaccion: (id: number) => `/ordenes/${id}/agregar-refaccion/`,
    evidencias: {
      list: "/ordenes/evidencias/",
      detail: (id: number) => `/ordenes/evidencias/${id}/`,
    },
  },
  inventario: {
    list: "/inventario/",
    detail: (id: number) => `/inventario/${id}/`,
    ajustarStock: (id: number) => `/inventario/${id}/ajustar-stock/`,
    compatibles: {
      list: "/inventario/compatibilidades/",
      detail: (id: number) => `/inventario/compatibilidades/${id}/`,
    },
  },
  users: {
    list: "/users/",
    tecnicos: "/users/tecnicos/",
    detail: (id: number) => `/users/${id}/`,
    resetPassword: (id: number) => `/users/${id}/reset-password/`,
    cambiarPasswordPropio: (id: number) => `/users/${id}/change-password/`,
    activar: (id: number) => `/users/${id}/activate/`,
    desactivar: (id: number) => `/users/${id}/deactivate/`,
  },
  auditoria: {
    list: "/auditoria/",
    detail: (id: number) => `/auditoria/${id}/`,
  },
  cotizaciones: {
    list: "/cotizaciones/",
    detail: (id: number) => `/cotizaciones/${id}/`,
    items: (id: number) => `/cotizaciones/${id}/items/`,
    itemDetail: (id: number, itemId: number) => `/cotizaciones/${id}/items/${itemId}/`,
    cambiarEstado: (id: number) => `/cotizaciones/${id}/cambiar-estado/`,
    autorizar: (id: number) => `/cotizaciones/${id}/autorizar/`,
    reportarCancelacion: (id: number) => `/cotizaciones/${id}/reportar-cancelacion/`,
    pdfCliente: (id: number) => `/cotizaciones/${id}/pdf-cliente/`,
    pdfEmpresa: (id: number) => `/cotizaciones/${id}/pdf-empresa/`,
    categorias: "/cotizaciones/categorias/",
    categoriaDetail: (id: number) => `/cotizaciones/categorias/${id}/`,
    categoriasReorder: "/cotizaciones/categorias/reorder/",
    subcategorias: "/cotizaciones/subcategorias/",
    subcategoriaDetail: (id: number) => `/cotizaciones/subcategorias/${id}/`,
    subcategoriasReorder: "/cotizaciones/subcategorias/reorder/",
    tiposReparacion: "/cotizaciones/tipos-reparacion/",
    tipoReparacionDetail: (id: number) => `/cotizaciones/tipos-reparacion/${id}/`,
    tiposReparacionReorder: "/cotizaciones/tipos-reparacion/reorder/",
    formulas: "/cotizaciones/formulas/",
    formulaDetail: (id: number) => `/cotizaciones/formulas/${id}/`,
    formulasDisponibles: "/cotizaciones/formulas/disponibles/",
    fuentesApi: "/cotizaciones/fuentes-api/",
    productosApi: "/cotizaciones/productos-api/",
    resolverFormula: "/cotizaciones/resolver-formula/",
  },
  publicaciones: {
    exportarPng: "/publicaciones/exportar-png/",
  },
};
