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
      list: "/inventario/compatibles/",
      detail: (id: number) => `/inventario/compatibles/${id}/`,
    },
  },
  users: {
    list: "/users/",
    detail: (id: number) => `/users/${id}/`,
    cambiarPassword: (id: number) => `/users/${id}/cambiar-password/`,
    activar: (id: number) => `/users/${id}/activar/`,
    desactivar: (id: number) => `/users/${id}/desactivar/`,
  },
  auditoria: {
    list: "/auditoria/",
    detail: (id: number) => `/auditoria/${id}/`,
  },
};
