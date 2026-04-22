# fix(perfil): formulario de contraseña + tokens + cache de queries — v0.2.1

## Motivación

Tras la integración del cambio de contraseña en v0.2.0 se detectaron tres problemas:

1. El formulario nunca enviaba la petición al backend — los campos mostraban "Required"
   aunque tuvieran texto.
2. Al cambiar la contraseña el backend devuelve tokens nuevos, pero el front no los
   guardaba, dejando la sesión con tokens que el backend ya invalidó.
3. React Query estaba configurado de forma muy agresiva (`staleTime: 0` +
   `refetchOnMount: "always"`), causando peticiones redundantes y skeletons innecesarios
   al volver a secciones ya visitadas.

---

## Cambios

### `src/features/perfil/PerfilPage.tsx`
- `PasswordInput` reescrito con `React.forwardRef` para que el `ref` de
  `react-hook-form` llegue al `<Input>` real y los valores se lean correctamente.
- `ChangePasswordCard` ahora llama `setTokens({ access, refresh })` en `onSuccess`
  con los tokens que devuelve el backend.
- Import de `React` añadido (requerido por `forwardRef`) y de `useAuthStore`.

### `src/api/users.ts`
- `cambiarPasswordPropio` tipado como
  `post<{ detail: string; access: string; refresh: string }>` y añade `.then(r => r.data)`
  para devolver el body directamente al mutation.

### `src/store/authStore.ts`
- Nueva acción `setTokens(tokens: AuthTokens)` — reemplaza ambos tokens en el estado
  de Zustand (y en el persist) sin tocar el resto del estado.

### `src/lib/queryClient.ts`
- `staleTime`: `0` → `1000 * 30` (30 s)
- `refetchOnMount`: `"always"` → `true` (solo si la data está stale)
- `refetchOnWindowFocus`: `true` → `false`

### Versión
- `package.json` y `src-tauri/tauri.conf.json` → `0.2.1`

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/features/perfil/PerfilPage.tsx` | `forwardRef` en `PasswordInput`, `setTokens` en `onSuccess` |
| `src/api/users.ts` | tipo de respuesta con tokens + `.then(r => r.data)` |
| `src/store/authStore.ts` | acción `setTokens` |
| `src/lib/queryClient.ts` | `staleTime`, `refetchOnMount`, `refetchOnWindowFocus` |
| `package.json` | versión 0.2.1 |
| `src-tauri/tauri.conf.json` | versión 0.2.1 |
| `docs/changelogs/v0.2.1.md` | changelog |

## Cómo verificar

1. Ir a **Mi perfil** → **Cambiar contraseña**.
2. Ingresar contraseña actual correcta y una nueva → debe mostrarse toast de éxito y limpiar el form.
3. Verificar en las DevTools (Application → Local Storage / Zustand) que los tokens cambiaron.
4. Navegar entre secciones varias veces — las secciones ya visitadas no deben mostrar skeleton ni lanzar petición dentro de los primeros 30 s.
5. Repetir con contraseña actual incorrecta → toast con mensaje del backend.
