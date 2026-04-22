# feat(perfil): cambiar contraseña desde el perfil — v0.2.0

## Motivación

Hasta ahora el usuario no podía cambiar su propia contraseña — dependía de que
un administrador lo hiciera desde la página de Usuarios. Esta PR agrega el formulario
directamente en "Mi perfil" usando el endpoint `change-password` del backend.

---

## Cambios

### `src/lib/schemas/user.ts`
- Nuevo `cambiarPasswordPropioSchema`: `password_actual`, `password_nuevo`,
  `password_nuevo_confirm` + refine que verifica que los dos últimos coincidan.
- Nuevo tipo exportado `CambiarPasswordPropioFormData`.

### `src/lib/config.ts`
- Nuevo endpoint `ENDPOINTS.users.cambiarPasswordPropio(id)` → `/users/{id}/change-password/`.

### `src/api/users.ts`
- Nuevo método `usersApi.cambiarPasswordPropio(id, data)` que envía los 3 campos al backend.

### `src/features/perfil/PerfilPage.tsx`
- Se reemplaza la card placeholder "Más opciones en camino" por la card **Cambiar contraseña**.
- Componente `PasswordInput`: input de tipo password con toggle de visibilidad (ojo).
- Componente `ChangePasswordCard`: formulario con `react-hook-form` + Zod, mutation con
  `useMutation`, toast de éxito con reset del form, toast de error con mensaje del backend.

### Versión
- `package.json` y `tauri.conf.json` → `0.2.0`

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/schemas/user.ts` | `cambiarPasswordPropioSchema` + tipo |
| `src/lib/config.ts` | endpoint `cambiarPasswordPropio` |
| `src/api/users.ts` | método `cambiarPasswordPropio` |
| `src/features/perfil/PerfilPage.tsx` | card con formulario de cambio de contraseña |
| `package.json` | versión 0.2.0 |
| `src-tauri/tauri.conf.json` | versión 0.2.0 |
| `docs/all/perfil-cambiar-password.md` | documentación |
| `docs/changelogs/v0.2.0.md` | changelog |

## Cómo verificar

1. Iniciar sesión con cualquier usuario.
2. Abrir **Mi perfil**.
3. Llenar la card **Cambiar contraseña** con la contraseña actual correcta y una nueva.
4. Verificar toast de éxito y que el form se limpia.
5. Repetir con contraseña actual incorrecta — debe aparecer el mensaje del backend.
6. Dejar las contraseñas nuevas distintas — Zod debe bloquear el envío con mensaje de error.
