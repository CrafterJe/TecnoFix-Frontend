# feat(seguridad): alinear permisos por rol con backend + fixes UI — v1.4.0

## Motivación

El backend (TecnoFix-BackEnd) aplicó cambios de **autorización por rol** a raíz de
una auditoría de permisos (2026-06-03): la lectura de usuarios pasó a ser
solo-admin, se expusieron rutas reales (`reset-password`, `activate`, `deactivate`,
`compatibilidades`) y se agregó un endpoint dedicado de técnicos. El frontend tenía
llamadas que ahora rompían (403/404) y un flujo de recuperación de contraseña que
fingía funcionar sin backend.

En paralelo se corrigieron defectos de UI en los diálogos de cotizaciones (X
duplicada en el visor de PDF y responsividad del diálogo de autorización).

---

## Cambios

### 1. Alineación con permisos/rutas del backend

- **Técnicos**: lectura de usuarios ahora es solo-admin en el backend, así que los
  dropdowns de Órdenes dejan de usar `usersApi.list()` filtrando por rol y pasan a
  `GET /users/tecnicos/` (`usersApi.tecnicos()`), que devuelve un array directo
  `[{ id, nombre }]` (no paginado) accesible a cualquier rol. Esto además es más
  robusto: antes, con >100 usuarios, el filtro en cliente podía perder técnicos.
- **Rutas de usuarios**: `cambiar-password/` → `reset-password/`,
  `activar/` → `activate/`, `desactivar/` → `deactivate/`. `usersApi.cambiarPassword`
  → `usersApi.resetPassword`.
- **Compatibles de inventario (404)**: `/inventario/compatibles/` →
  `/inventario/compatibilidades/`.

### 2. Enlaces externos en la app de escritorio

- Nuevo `src/lib/external.ts` con `openExternalUrl()` y `handleExternalClick()`.
  En Tauri un `<a target="_blank">` no abre el navegador del SO; ahora se intercepta
  el clic y se abre con el plugin `opener`. En web no cambia nada (el `<a>` abre
  nativo). Aplicado a `url_producto` (ItemWizard) y `link_referencia`
  (CotizacionDetailPage).
- `src-tauri/capabilities/default.json`: añadido `opener:allow-open-url`.

### 3. Fixes de UI (cotizaciones)

- **PdfPreviewDialog**: eliminada la X manual del header (el `DialogContent` de
  shadcn ya provee la suya → se veían dos).
- **AutorizarCotizacionDialog** (responsividad):
  - `w-[95vw]` para margen en pantallas medianas/chicas.
  - Stepper con títulos `hidden sm:inline` (solo círculos en móvil).
  - Fila de modo de cliente: apila en móvil + botones con `flex-wrap`.
  - Focus ring: contenido del `ScrollArea` envuelto en contenedor con padding para
    que el anillo de foco no se recorte contra el `overflow-hidden`.

### 4. Login

- Oculto el botón "¿Olvidaste tu contraseña?": el flujo simulaba el envío y el
  backend aún no implementa `POST /users/auth/password-reset/`. Las vistas quedan
  dormidas para reactivarse cuando exista la ruta.

### 5. Versión

- `package.json` y `src-tauri/tauri.conf.json` → `1.4.0`.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/config.ts` | rutas técnicos/reset-password/activate/deactivate/compatibilidades |
| `src/api/users.ts` | `tecnicos()`; `resetPassword` |
| `src/types/user.ts` | `interface Tecnico` |
| `src/features/ordenes/OrdenesPage.tsx` | dropdown técnicos vía endpoint dedicado |
| `src/features/ordenes/OrdenDetailPage.tsx` | idem |
| `src/features/users/UsersPage.tsx` | `resetPassword`; `DialogDescription` |
| `src/lib/external.ts` | **nuevo** helper de enlaces externos |
| `src/features/cotizaciones/components/ItemWizard.tsx` | enlace externo |
| `src/features/cotizaciones/CotizacionDetailPage.tsx` | enlace externo |
| `src/features/cotizaciones/components/PdfPreviewDialog.tsx` | X duplicada |
| `src/features/cotizaciones/components/AutorizarCotizacionDialog.tsx` | responsividad + focus ring |
| `src/features/auth/LoginPage.tsx` | oculto flujo de recuperación |
| `src-tauri/capabilities/default.json` | `opener:allow-open-url` |
| `package.json`, `src-tauri/tauri.conf.json` | versión 1.4.0 |
| `docs/changelogs/v1.4.0.md` | changelog |
| `docs/backend-docs/auditoria-permisos-endpoints.md` | auditoría de permisos |

---

## Build / prueba

> ⚠️ Cambia un permiso de Tauri (`opener:allow-open-url`): requiere recompilar el
> lado Rust para que la apertura de enlaces externos funcione en la app de escritorio.

```bash
npm run build          # tsc + vite (verificado: OK)
npm run tauri dev      # o build de Windows, para probar enlaces externos
```

1. **Órdenes** → abrir lista y detalle como recepción/técnico → el dropdown de
   técnicos carga sin 403.
2. **Cotización** (productos API / item con link) → clic en el icono de enlace →
   abre el navegador del SO en la app de escritorio.
3. **Cotización finalizada** → **Autorizar** → revisar el diálogo en varios anchos:
   sin cortes, el focus ring completo al seleccionar campos, una sola X en el visor
   de PDF.
4. **Login** → ya no aparece "¿Olvidaste tu contraseña?".

---

## Notas

- La lógica de permisos real vive en el backend; el frontend solo se alinea. Ver
  `docs/backend-docs/auditoria-permisos-endpoints.md` para el detalle endpoint por
  endpoint.
- `authApi.passwordReset` y `ENDPOINTS.auth.passwordReset` quedan como código
  inactivo (no se eliminaron); se reactivan junto con el botón del login cuando el
  backend implemente la recuperación por correo.
