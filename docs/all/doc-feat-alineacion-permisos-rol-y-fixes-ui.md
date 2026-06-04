# Alineación de permisos por rol con el backend + fixes de UI

> Documentación técnica de la versión **v1.4.0**.
> PR: [pr-alineacion-permisos-rol-y-fixes-ui-v1.4.0.md](../PR/pr-alineacion-permisos-rol-y-fixes-ui-v1.4.0.md) ·
> Changelog: [v1.4.0.md](../changelogs/v1.4.0.md) ·
> Auditoría base: [auditoria-permisos-endpoints.md](../backend-docs/auditoria-permisos-endpoints.md)

## Contexto

El backend (TecnoFix-BackEnd) endureció la **autorización por rol** a raíz de una
auditoría de permisos (2026-06-03). El frontend solo refleja la UI; la seguridad
real la impone el backend. Tras esos cambios, varias llamadas del front quedaban
rotas (403/404) y había un flujo de recuperación de contraseña que simulaba
funcionar sin endpoint. Esta versión alinea el front y, de paso, corrige defectos
de UI en los diálogos de cotizaciones.

---

## 1. Lectura de usuarios ahora es solo-admin → endpoint de técnicos

**Problema:** `GET /users/` y `GET /users/{id}/` pasaron a exigir rol admin. Los
dropdowns de técnicos en Órdenes los armaban con `usersApi.list()` filtrando
`rol === "tecnico"` en el cliente → ahora 403 para recepción/técnico.

**Solución:** se usa el endpoint dedicado `GET /users/tecnicos/`, accesible a
cualquier rol autenticado, que devuelve un **array directo** `[{ id, nombre }]`
(no paginado).

- `src/lib/config.ts`: + `users.tecnicos: "/users/tecnicos/"`.
- `src/types/user.ts`: + `interface Tecnico { id: number; nombre: string }`.
- `src/api/users.ts`: + `usersApi.tecnicos()`.
- `OrdenesPage.tsx` / `OrdenDetailPage.tsx`: el `useQuery` de técnicos pasa de
  `usersApi.list({ page_size: 100 })` + `select` a `usersApi.tecnicos()`.
  `OrdenDetailPage` conserva `enabled: isAdmin` (el bloque "Asignar técnico" y el
  endpoint `asignar-tecnico/` siguen siendo solo-admin).

**Por qué es mejor:** el endpoint no está paginado (la acción `@action` de DRF
devuelve `Response(serializer.data)` sin paginar), así que ya no se pierde ningún
técnico. Antes, con >100 usuarios, el filtro en cliente sobre la primera página
podía dejar fuera técnicos.

`UsersPage.tsx` sigue usando `usersApi.list()` porque vive en la ruta `/usuarios`,
ya protegida por `ProtectedRoute roles={["admin"]}`.

---

## 2. Rutas de usuarios alineadas con el backend

Las rutas del front no coincidían con las reales del backend:

| Antes (front) | Ahora (backend real) |
|---|---|
| `/users/{id}/cambiar-password/` | `/users/{id}/reset-password/` |
| `/users/{id}/activar/` | `/users/{id}/activate/` |
| `/users/{id}/desactivar/` | `/users/{id}/deactivate/` |

- `src/lib/config.ts`: rutas corregidas.
- `src/api/users.ts`: `cambiarPassword(id, password)` → `resetPassword(id, { password, password_confirm })`.
- `src/features/users/UsersPage.tsx`: el diálogo de cambio de contraseña usa
  `usersApi.resetPassword`; además se agregó `DialogDescription` a los diálogos de
  usuario (accesibilidad / consistencia).

---

## 3. Compatibles de inventario (404)

El front llamaba `/inventario/compatibles/` pero el backend expone
`/inventario/compatibilidades/`.

- `src/lib/config.ts`: `compatibles.list/detail` apuntan a `compatibilidades`.
  Se conserva la clave JS `compatibles` (nombre interno del front), así
  `api/inventario.ts` no requiere cambios.

---

## 4. Enlaces externos en la app de escritorio (Tauri)

**Problema:** en el webview de Tauri un `<a target="_blank">` no abre el navegador
del sistema. Afectaba los enlaces a producto/referencia en cotizaciones.

**Solución:** nuevo helper `src/lib/external.ts`:

```ts
export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function handleExternalClick(e: MouseEvent<HTMLAnchorElement>): void {
  if (isTauri()) {
    e.preventDefault();
    void openExternalUrl(e.currentTarget.href);
  }
}
```

- En **web** el handler no hace nada → el `<a target="_blank">` abre nativo, como
  siempre (se conserva click-derecho, middle-click, accesibilidad).
- En **Tauri** intercepta el clic y abre con el plugin `opener`.
- Aplicado en `ItemWizard.tsx` (`url_producto`, conservando `stopPropagation`) y
  `CotizacionDetailPage.tsx` (`link_referencia`).
- `src-tauri/capabilities/default.json`: + permiso `opener:allow-open-url`.

> **Build:** por ser cambio de permiso de Tauri, requiere recompilar el lado Rust
> para que funcione en la app de escritorio. En web no.

---

## 5. Fixes de UI — diálogos de cotizaciones

### 5.1 Visor de PDF — X de cerrar duplicada

`PdfPreviewDialog` añadía una X manual en el header, pero `DialogContent` (shadcn)
ya renderiza su propia X automática → aparecían dos. Se eliminó la manual (y el
import `X`), y el título lleva `pr-8` para no quedar bajo la X automática.

### 5.2 AutorizarCotizacionDialog — responsividad

- **Ancho:** `w-[95vw] max-w-2xl` (antes `w-full`, que tocaba los bordes en
  pantallas medianas).
- **Stepper:** los títulos de paso usan `hidden sm:inline` — en móvil solo se ven
  los círculos numerados; en `sm+` aparecen con texto.
- **Modo de cliente:** la fila Label + 3 botones pasó a `flex-col` en móvil y los
  botones a `flex-wrap`, en vez de cortarse.
- **Focus ring recortado:** el contenido del `ScrollArea` se envolvió en un `<div>`
  con padding interno (`p-1.5 pr-3`). Los `Input`/`Select` dibujan un anillo de foco
  que sobresale ~4px (`ring-2` + `ring-offset-2`); sin ese padding, el anillo de los
  campos de la columna izquierda / fila superior se cortaba contra el
  `overflow-hidden` del `ScrollArea`.

---

## 6. Login — recuperación de contraseña oculta

El flujo "¿Olvidaste tu contraseña?" simulaba el envío (`setTimeout`) sin llamar a
ningún endpoint; el backend aún no implementa `POST /users/auth/password-reset/`. Se
comentó el botón de acceso para no exponer un flujo que no hace nada. Las vistas
`forgot`/`forgot-sent` y `authApi.passwordReset` quedan **dormidas** (no eliminadas)
para reactivarse cuando exista la ruta.

Esto es independiente del **reset de admin** (`POST /users/{id}/reset-password/`),
que sí existe y funciona desde la página de Usuarios.

---

## Verificación

- `npm run build` (tsc + vite): OK.
- Pruebas manuales sugeridas en el PR (dropdown de técnicos sin 403, enlaces
  externos en escritorio, diálogo de autorización en varios anchos, una sola X en
  el visor de PDF, login sin el enlace de recuperación).
