# refactor: arquitectura, UI y correcciones — v0.1.25

## Motivación

Esta rama consolida una sesión de mejoras sobre la base existente. El objetivo principal
fue organizar el proyecto con capas claras (tipos, schemas, endpoints, servicios) para
que sea más fácil agregar features sin duplicar definiciones. Además se corrigieron
varios comportamientos visuales y de lógica detectados en uso real.

---

## Cambios

### Arquitectura

**`src/types/`** — de un archivo monolítico a archivos por dominio:
```
types/
  common.ts     PaginatedResponse, PaginationParams
  user.ts       User, UserRole, UserPayload
  auth.ts       AuthTokens, AuthResponse
  cliente.ts    Cliente, ClientePayload, Dispositivo, DispositivoPayload, TipoDispositivo
  orden.ts      Orden, OrdenPayload, OrdenUpdatePayload, OrdenFilters, Evidencia, OrdenRefaccion
  inventario.ts Refaccion, RefaccionPayload, RefaccionCompatible, CompatiblePayload, InventarioFilters
  auditoria.ts  AuditLog, AuditAction, AuditoriaFilters
  index.ts      re-exporta todo (imports existentes no cambian)
```

**`src/lib/schemas/`** — mismo patrón:
```
schemas/
  auth.ts       loginSchema
  cliente.ts    clienteSchema, dispositivoSchema
  orden.ts      ordenSchema, cambiarEstadoSchema, asignarTecnicoSchema
  inventario.ts refaccionSchema, ajusteStockSchema
  user.ts       usuarioSchema, cambiarPasswordSchema
  index.ts      re-exporta todo
```

**`src/lib/config.ts`** — ahora centraliza todos los endpoints del backend:
```ts
ENDPOINTS.auth.login
ENDPOINTS.ordenes.cambiarEstado(id)
ENDPOINTS.inventario.ajustarStock(id)
// etc.
```
Cambiar una ruta del backend = editar una línea.

**`src/store/authStore.ts`** — eliminada la duplicación de llamadas axios directas.
Ahora usa `authApi` de `src/api/auth.ts` como el resto de los stores.

**`src/api/`** — todos los archivos importan payloads y filtros desde `@/types`
en vez de definirlos localmente.

---

### UI — Sidebar

- Iconos centrados al colapsar (faltaba `w-full` en el `NavLink`).
- Ítems distribuidos con `justify-evenly` al colapsar y `justify-start space-y-1`
  al expandir. Se eliminó el `ScrollArea` wrapper innecesario.

### UI — Login

- Redirección siempre al Dashboard tras autenticarse (antes usaba `location.state.from`
  que podía llevar a páginas de otro usuario).
- Panel de recuperar contraseña: email → enviar → confirmación visual con botón volver.
  Listo para conectar al endpoint real (`authApi.passwordReset`).

### Tipografía

- Montserrat integrada como variable font auto-hospedada (`public/fonts/montserrat/`).
- Funciona offline (sin dependencia de Google Fonts CDN).
- Configurada como `font-sans` en Tailwind.

### Usuarios

- Campo `password_confirm` agregado al form de crear usuario con validación Zod.
- El backend recibe `password` y `password_confirm` correctamente.
- Toast de error ahora muestra el mensaje exacto del backend.

### Auditoría

- Columna "Usuario" usa `user_nombre` del backend (campo calculado, default "Sistema").
- Columna "Acción" usa `action_display` del backend (label legible en español).
- Detalle del registro reemplaza JSON crudo por tabla de cambios:
  - **CREATE**: campos y valores del objeto creado.
  - **DELETE**: campos y valores del objeto eliminado.
  - **UPDATE / ASSIGN / STATUS_CHANGE**: solo campos que cambiaron,
    con valor anterior (fondo muted) → valor nuevo (fondo cian).
  - **LOGIN**: mensaje simple sin datos adicionales.
- Tipo `AuditLog` actualizado con `user_nombre: string` y `action_display: string`.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/types/*` | Separados por dominio |
| `src/lib/schemas/*` | Separados por dominio |
| `src/lib/config.ts` | Endpoints centralizados |
| `src/api/*.ts` (6 archivos) | Usan ENDPOINTS + tipos de @/types |
| `src/store/authStore.ts` | Usa authApi, elimina axios directo |
| `src/components/layout/Sidebar.tsx` | Centrado + distribución |
| `src/features/auth/LoginPage.tsx` | Dashboard redirect + forgot password |
| `src/features/users/UsersPage.tsx` | password_confirm + error detail |
| `src/features/auditoria/AuditoriaPage.tsx` | user_nombre + diff legible |
| `src/index.css` | @font-face Montserrat |
| `tailwind.config.ts` | font-sans: Montserrat |
| `public/fonts/montserrat/` | Variable fonts auto-hospedados |
| `docs/changelogs/v0.1.25.md` | Changelog |

## Cómo verificar

1. **Tipografía**: toda la app usa Montserrat, funciona sin internet.
2. **Sidebar**: colapsar → iconos centrados y distribuidos. Expandir → compacto arriba.
3. **Login**: autenticarse → siempre va al Dashboard.
4. **Forgot password**: clic en "¿Olvidaste tu contraseña?" → form → enviar → confirmación.
5. **Crear usuario**: el form pide contraseña y confirmación — Zod valida que coincidan.
6. **Auditoría**: columna Usuario muestra nombre real. Detalle muestra diff legible.
