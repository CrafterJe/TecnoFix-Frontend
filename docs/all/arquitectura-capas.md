# Arquitectura de capas del proyecto

## Flujo de una petición al backend

```
.env
  VITE_API_URL=http://localhost:8000/api/v1
       ↓
src/lib/config.ts
  BASE_URL + ENDPOINTS.<dominio>.<acción>
       ↓
src/lib/axios.ts
  apiClient — axios con interceptores de token (Bearer) y refresco automático
       ↓
src/api/<dominio>.ts
  Llamada HTTP tipada — usa ENDPOINTS y tipos de @/types
       ↓
src/store/ o componente
  Store (estado global) o useQuery/useMutation (datos del servidor)
       ↓
src/features/<dominio>/
  Página o componente — solo maneja UI
```

---

## Carpetas y responsabilidades

### `src/types/`
Interfaces y tipos TypeScript de todo el proyecto. Un archivo por dominio.

| Archivo | Contenido |
|---|---|
| `common.ts` | `PaginatedResponse<T>`, `PaginationParams` |
| `user.ts` | `User`, `UserRole`, `UserPayload` |
| `auth.ts` | `AuthTokens`, `AuthResponse` |
| `cliente.ts` | `Cliente`, `ClientePayload`, `Dispositivo`, `DispositivoPayload`, `TipoDispositivo` |
| `orden.ts` | `Orden`, `OrdenPayload`, `OrdenUpdatePayload`, `OrdenFilters`, `Evidencia`, `OrdenRefaccion`, `EstadoOrden` |
| `inventario.ts` | `Refaccion`, `RefaccionPayload`, `RefaccionCompatible`, `CompatiblePayload`, `InventarioFilters` |
| `auditoria.ts` | `AuditLog`, `AuditAction`, `AuditoriaFilters` |
| `index.ts` | Re-exporta todo — los imports `from "@/types"` funcionan sin cambios |

### `src/lib/schemas/`
Esquemas de validación Zod y sus tipos inferidos. Un archivo por dominio.

| Archivo | Schemas |
|---|---|
| `auth.ts` | `loginSchema` |
| `cliente.ts` | `clienteSchema`, `dispositivoSchema` |
| `orden.ts` | `ordenSchema`, `cambiarEstadoSchema`, `asignarTecnicoSchema` |
| `inventario.ts` | `refaccionSchema`, `ajusteStockSchema` |
| `user.ts` | `usuarioSchema`, `cambiarPasswordSchema` |
| `index.ts` | Re-exporta todo — los imports `from "@/lib/schemas"` funcionan sin cambios |

### `src/lib/config.ts`
Configuración global y **todos** los endpoints del backend en un solo objeto `ENDPOINTS`.

```ts
ENDPOINTS.auth.login
ENDPOINTS.ordenes.detail(id)
ENDPOINTS.inventario.ajustarStock(id)
```

Para cambiar una ruta del backend: editar únicamente este archivo.

La URL base se lee del `.env`:
```
VITE_API_URL=http://localhost:8000/api/v1
```

En producción se inyecta desde GitHub Secrets durante el build de Tauri.

### `src/lib/axios.ts`
Cliente axios configurado con:
- `baseURL` desde `config.ts`
- Interceptor de request: agrega `Authorization: Bearer <token>`
- Interceptor de response: maneja 401, refresca el token automáticamente y reintenta

### `src/api/`
Servicios HTTP por dominio. Cada archivo exporta un objeto con métodos tipados.

```ts
ordenesApi.list(filters)
ordenesApi.cambiarEstado(id, estado)
clientesApi.dispositivos.create(data)
```

Todos importan `ENDPOINTS` de `config.ts` y tipos de `@/types`.

### `src/store/`
Estado global con Zustand (persiste en localStorage).

| Store | Responsabilidad |
|---|---|
| `authStore.ts` | Usuario autenticado, tokens, login, logout, refresh |
| `uiStore.ts` | Estado del sidebar (colapsado/expandido) |

El `authStore` usa `authApi` — no llama axios directamente.

### `src/hooks/`
Custom hooks reutilizables.

| Hook | Responsabilidad |
|---|---|
| `useAuth.ts` | Acceso al usuario, roles (`isAdmin`, `isTecnico`, `hasRole`) |
| `usePagination.ts` | Estado de página y page_size para listados |

### `src/features/`
Una carpeta por módulo de negocio. Cada feature solo importa de las capas anteriores,
nunca llama axios directamente ni define tipos propios que ya existan en `@/types`.

---

## Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL base del backend. En local se lee del `.env`. En CI se inyecta desde GitHub Secrets. |
| `VITE_APP_NAME` | Nombre de la app (actualmente no usado en código) |

El fallback si no hay `.env` es `http://localhost:8000/api/v1`.
