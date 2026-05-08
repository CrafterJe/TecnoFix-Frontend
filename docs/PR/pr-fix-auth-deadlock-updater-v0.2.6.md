# fix(auth): deadlock interceptor, splash sync y updater en paralelo — v0.2.6

## Motivación

Al abrir la app después de varios días sin uso el refresh token estaba expirado. El
interceptor de axios intentaba renovarlo, el servidor respondía 401, y el propio
interceptor disparaba un segundo intento de refresh que quedaba en cola esperando al
primero. Deadlock: la app se congelaba indefinidamente, ninguna petición llegaba al
servidor y el check de actualizaciones nunca corría.

Además el splash screen cerraba por timer fijo (1 500 ms) sin esperar a que
`initializeAuth()` terminara, y el check de actualizaciones se iniciaba después del
splash, por lo que el diálogo aparecía con un delay visible o directamente no aparecía.

---

## Cambios

### `src/lib/axios.ts`
- Añadida guarda al inicio del handler de 401: si la request que falló es el propio
  endpoint `/auth/refresh/`, hace logout inmediato y rechaza la promise. Elimina el
  ciclo deadlock interceptor → refreshToken → interceptor.

### `src/App.tsx`
- El splash ahora espera a que **ambas** condiciones sean true antes de cerrar:
  animación completada (`splashDone`) **y** `initializeAuth()` resuelta (`authReady`).
- `initUpdater()` corre en **paralelo** con `initializeAuth()` durante el splash,
  con timeout de 5 s para no bloquear si no hay conexión. Al cerrar el splash el
  resultado ya está en memoria y el diálogo de actualización abre al instante.

### Versión
- `package.json` y `src-tauri/tauri.conf.json` → `0.2.6`.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/axios.ts` | guarda anti-deadlock en handler 401 |
| `src/App.tsx` | splash espera auth + updater en paralelo |
| `package.json` | versión 0.2.6 |
| `src-tauri/tauri.conf.json` | versión 0.2.6 |
| `docs/changelogs/v0.2.6.md` | changelog |
