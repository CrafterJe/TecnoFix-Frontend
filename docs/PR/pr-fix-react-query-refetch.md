# fix(query): refetch al navegar entre secciones + botón Refrescar manual

## Problema

Al navegar entre secciones de la app (p. ej. Auditoría → Dashboard → Auditoría) la
petición al backend **no** se volvía a disparar. La vista mostraba datos cacheados y
no reflejaba cambios recientes del servidor hasta hacer hard refresh (F5) o
login/logout.

En los logs del backend se confirmaba: la petición inicial llegaba, pero al regresar
a la pantalla desde el sidebar ya no se registraba ninguna llamada.

## Causa

`src/lib/queryClient.ts` tenía configurado:

```ts
staleTime: 1000 * 60 * 5,     // 5 minutos
refetchOnWindowFocus: false,
```

El `Layout` con `<Outlet />` sí desmonta y remonta las páginas al cambiar de ruta
(no usa keep-alive), por lo que `refetchOnMount` debería haberse disparado. Pero
TanStack Query solo refetchea al montar si los datos están **stale**; con 5 min de
`staleTime`, cualquier navegación dentro de esa ventana devolvía la cache sin tocar
el servidor. Además `refetchOnWindowFocus: false` eliminaba el otro trigger común
(volver al tab/ventana).

Ningún `useQuery` de los módulos declaraba su propio `staleTime`, así que todos
heredaban el default global.

## Solución

### 1. Nuevos defaults del QueryClient

`src/lib/queryClient.ts`:

```ts
staleTime: 0,                  // siempre stale → refetchea al montar
gcTime: 1000 * 60 * 5,         // mantener en cache 5 min para back/forward rápido
refetchOnMount: "always",      // pide fresco cada vez que monta, incluso si no está stale
refetchOnWindowFocus: true,    // refresca al volver al tab/ventana Tauri
refetchOnReconnect: true,
retry: 1,
```

Con esto las peticiones se disparan en los siguientes casos:

1. El usuario entra a una pantalla (navegación desde sidebar).
2. El usuario vuelve al tab/ventana de Tauri tras estar en otro lado.
3. El usuario da clic en "Refrescar".
4. Al completar una mutación (create/edit/delete) que invalida la query — esto ya
   estaba cableado con `qc.invalidateQueries` en los `useMutation`.
5. Al reconectarse a internet tras perder conexión.

No hay polling (`refetchInterval`) en ninguna pantalla. La auditoría se considera
suficientemente cubierta con `refetchOnMount: "always"` + focus + botón manual,
dado que es una pantalla de consulta (se entra, se revisa, se sale) y no una que se
deja abierta mirando en vivo.

### 2. Botón "Refrescar" manual

Se agregó un botón en el `PageHeader.actions` de las 5 páginas de listado:

- `src/features/auditoria/AuditoriaPage.tsx`
- `src/features/ordenes/OrdenesPage.tsx`
- `src/features/clientes/ClientesPage.tsx`
- `src/features/inventario/InventarioPage.tsx`
- `src/features/users/UsersPage.tsx`

Usa `refetch()` del `useQuery` correspondiente y muestra el ícono `RotateCw`
girando mientras `isFetching` está activo. Queda como escape manual cuando el
usuario sospecha que hay datos nuevos (otro usuario editó algo) sin tener que
navegar fuera y volver.

## Trade-offs considerados

- **`staleTime` global de 30s vs 0**: se eligió `0` porque el volumen esperado
  (≤10 usuarios en turnos de 8h) no justifica cache agresivo, y el usuario prefiere
  ver datos frescos siempre. Si el backend empieza a mostrar carga, subir a 30-60s
  es un cambio de una línea.
- **`refetchOnWindowFocus: true`**: en Tauri es útil porque el usuario alt-tabea
  entre la app de taller y otras herramientas. El costo es una petición extra al
  volver, insignificante para este volumen.
- **Sin `refetchInterval` en Auditoría**: se descartó el polling cada 30s para no
  generar tráfico constante mientras una pestaña está abierta sin interacción. Si
  más adelante se requiere "tiempo real", se puede agregar con una sola línea.

## Archivos modificados

- `src/lib/queryClient.ts` — defaults del QueryClient
- `src/features/auditoria/AuditoriaPage.tsx` — botón Refrescar
- `src/features/ordenes/OrdenesPage.tsx` — botón Refrescar
- `src/features/clientes/ClientesPage.tsx` — botón Refrescar
- `src/features/inventario/InventarioPage.tsx` — botón Refrescar
- `src/features/users/UsersPage.tsx` — botón Refrescar

## Cómo verificar

1. Entrar a Auditoría (se ve petición en logs del backend).
2. Ir a Dashboard, volver a Auditoría → se ve **otra** petición en los logs.
3. Minimizar la ventana de Tauri, volver a enfocarla → se dispara petición.
4. Clic en "Refrescar" en cualquiera de las 5 páginas → petición + ícono girando.
5. Crear/editar/eliminar un registro → la lista se actualiza sin recargar
   (comportamiento ya existente vía `invalidateQueries`).
