# Fix: deadlock interceptor, splash sync y updater en paralelo — v0.2.6

## Problema

Al abrir la app después de varios días sin uso (refresh token expirado en el backend),
la app se congelaba indefinidamente y no detectaba actualizaciones.

### Causa raíz — deadlock en el interceptor de axios

`authApi.refresh()` usa `apiClient`, el mismo cliente que tiene el interceptor de
respuesta. Cuando el refresh token estaba expirado:

1. `initializeAuth()` llamaba `authApi.refresh()` → servidor respondía **401**.
2. El interceptor capturaba ese 401, veía `isRefreshing = false`, e intentaba
   refrescar llamando `refreshToken()` → segundo `authApi.refresh()` → **401 de nuevo**.
3. El interceptor capturaba ese segundo 401, pero ahora `isRefreshing = true`, así
   que metía la request en `failedQueue` y esperaba.
4. **Deadlock**: el interceptor externo esperaba que `refreshToken()` resolviera →
   `refreshToken()` esperaba a la inner request → la inner request estaba en
   `failedQueue` esperando a que el interceptor externo llamara `processQueue()`.

Todas las requests subsiguientes también quedaban en cola. La app mostraba loading
indefinido.

### Causa secundaria — splash desacoplado de auth

`SplashScreen` cerraba tras 1 500 ms fijos sin esperar a `initializeAuth()`. Los
componentes renderizaban con `isAuthenticated = true` (localStorage) e
`isInitialized = false`, disparando peticiones con tokens inválidos.

### Causa terciaria — updater después del deadlock

`initUpdater()` se llamaba tras `await initializeAuth()`. Con el deadlock, nunca
llegaba a ejecutarse y el diálogo de actualización nunca aparecía.

---

## Solución

### `src/lib/axios.ts` — guarda anti-deadlock

```typescript
if (originalRequest.url?.includes('auth/refresh')) {
  useAuthStore.getState().logout();
  return Promise.reject(error);
}
```

Si el endpoint que falla con 401 es el propio `/auth/refresh/`, se hace logout
inmediato sin intentar refrescar de nuevo. El `catch` de `initializeAuth()` recibe
el rechazo, limpia la sesión y setea `isInitialized: true`.

### `src/App.tsx` — splash sincronizado + updater en paralelo

```typescript
const updaterPromise = isTauri()
  ? Promise.race([
      initUpdater(),
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ]).catch(console.error)
  : Promise.resolve();

await Promise.all([initializeAuth(), updaterPromise]);
setAuthReady(true);
```

- El splash ahora espera a que **ambas** condiciones sean true: `splashDone`
  (animación) y `authReady` (auth + updater).
- `initUpdater()` corre en paralelo con `initializeAuth()` durante el splash.
- Timeout de 5 s en el updater: si no hay conexión, la app no queda bloqueada.
- Al cerrar el splash el resultado del check ya está en `pendingState`; el diálogo
  de actualización abre al instante cuando `UpdaterDialog` monta.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/axios.ts` | guarda anti-deadlock en handler 401 |
| `src/App.tsx` | splash espera auth + updater en paralelo |
