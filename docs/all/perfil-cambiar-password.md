# Cambiar contraseña desde el perfil

## Descripción

Cualquier usuario autenticado puede cambiar su propia contraseña desde la página
"Mi perfil" sin intervención de un administrador.

## Flujo

1. El usuario abre **Mi perfil** desde el menú de usuario.
2. Aparece la card **Cambiar contraseña** debajo de la información de la cuenta.
3. Completa los tres campos:
   - **Contraseña actual** — verificación de identidad.
   - **Nueva contraseña** — mínimo 8 caracteres.
   - **Confirmar nueva contraseña** — debe coincidir con el campo anterior.
4. Cada campo tiene un botón ojo para alternar visibilidad.
5. Al guardar:
   - Si todo es correcto → toast "Contraseña actualizada correctamente" y el form se limpia.
   - Si la contraseña actual es incorrecta → toast con el mensaje exacto del backend.
   - Si las contraseñas nuevas no coinciden → error de validación Zod antes de enviar.

## Endpoint

```
POST /api/v1/users/{id}/change-password/
```

Payload:

```json
{
  "password_actual": "...",
  "password_nuevo": "...",
  "password_nuevo_confirm": "..."
}
```

## Archivos involucrados

| Archivo | Rol |
|---|---|
| `src/features/perfil/PerfilPage.tsx` | UI: card con formulario + componentes `PasswordInput` y `ChangePasswordCard` |
| `src/lib/schemas/user.ts` | `cambiarPasswordPropioSchema` con validación Zod |
| `src/api/users.ts` | `usersApi.cambiarPasswordPropio(id, data)` |
| `src/lib/config.ts` | `ENDPOINTS.users.cambiarPasswordPropio(id)` |

## Notas

- El administrador todavía puede resetear la contraseña de otros usuarios desde la
  página de Usuarios (flujo separado, endpoint diferente: `cambiar-password`).
- El formulario queda deshabilitado si `user.id` no está disponible (caso edge).
