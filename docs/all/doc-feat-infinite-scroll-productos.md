# feat(cotizaciones): scroll infinito en búsqueda de productos — v1.1.0

## Problema

El `ItemWizard` cargaba hasta 20 productos en una sola query y los mostraba dentro
de un `ScrollArea` de Radix UI. Si la búsqueda devolvía más resultados el usuario
no podía verlos; además, `ScrollArea` introduce un viewport interno que desacopla
el scroll del contenedor, lo que hacía que el sentinel de `IntersectionObserver`
no se detectara correctamente.

---

## Solución

### Scroll infinito con `useInfiniteQuery` + `IntersectionObserver`

Se migró de `useQuery` a `useInfiniteQuery` (TanStack Query v5) en las dos
búsquedas del wizard:

| Query | queryKey |
|---|---|
| Por fuente (`step: "busqueda"`) | `["cotizaciones", "productos", fuenteId, debouncedBusquedaQuery]` |
| Global (`step: "global"`) | `["cotizaciones", "productos-global", debouncedGlobalQuery]` |

Ambas usan `page_size: 30` y `getNextPageParam: (last) => last.next ? last.current_page + 1 : undefined`.

El hook `useInfiniteScrollSentinel` encapsula la lógica del `IntersectionObserver`:

```tsx
function useInfiniteScrollSentinel({ hasMore, loading, onLoadMore }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore || loading) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) onLoadMore(); },
      { rootMargin: "100px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, onLoadMore]);
  return ref;
}
```

- `rootMargin: "100px"` dispara el prefetch 100 px antes del borde, dando sensación
  de scroll continuo.
- El observer se desconecta mientras hay un fetch en curso (`loading`) para no
  disparar múltiples páginas en paralelo.

### Reemplazo de `ScrollArea`

`ScrollArea` fue reemplazado por un `div` con `overflow-y-auto`. El problema con
Radix `ScrollArea` es que crea un viewport interno (`[data-radix-scroll-area-viewport]`)
que contiene el contenido; el sentinel `div` quedaba fuera del viewport real del
observer y nunca entraba al campo de visión.

---

## Componentes nuevos

### `ProductoRow`

Fila reutilizable para ambos listados. Reemplaza los `<button>` inline anteriores.

| Feature | Detalle |
|---|---|
| Accesibilidad | `role="button"`, `tabIndex={0}`, handler `onKeyDown` para Enter/Space, `focus-visible:ring-2` |
| Tooltip en título | Muestra el nombre completo si está truncado (requiere `TooltipProvider` global) |
| Link externo | Ícono `ExternalLink` que abre `url_producto` en el navegador; `e.stopPropagation()` evita que active la selección del producto |
| Badge fuente | Prop `showFuente` opcional, activo solo en búsqueda global |

### `InfiniteScrollFooter`

Wrapper del sentinel + indicador de carga + mensaje de "no hay más resultados":

```tsx
function InfiniteScrollFooter({ hasMore, loading, itemsCount, sentinelRef }) {
  return (
    <>
      {hasMore && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}
      {loading && <Loader2 className="animate-spin" />}
      {!hasMore && itemsCount > 0 && <p>No hay más resultados</p>}
    </>
  );
}
```

---

## Cambios en tipos

**`src/types/cotizaciones.ts` — `ProductoApi`**

| Campo | Antes | Después | Razón |
|---|---|---|---|
| `producto_id_externo` | `number` | `string` | El backend devuelve el ID externo como string (puede contener letras o guiones según el proveedor) |
| `url_producto` | — | `string` | Campo nuevo; permite enlazar al producto en el sitio del proveedor |

---

## `TooltipProvider` global (`src/main.tsx`)

Radix `Tooltip` requiere un `TooltipProvider` en el árbol de React para que
`delayDuration` y otras opciones se hereden globalmente. Se registró una única
instancia en la raíz con `delayDuration={500}`:

```tsx
<TooltipProvider delayDuration={500}>
  <App />
</TooltipProvider>
```

Sin esto, cada `Tooltip` funciona de forma aislada y el retraso por defecto (0 ms)
hace que el tooltip aparezca de inmediato al pasar el ratón.

---

## Debounce de búsqueda por fuente

Se añadió un estado `debouncedBusquedaQuery` con 300 ms de debounce (igual que
`debouncedGlobalQuery`). Antes, la búsqueda por fuente disparaba la query en cada
keystroke, causando peticiones innecesarias mientras el usuario escribía.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/features/cotizaciones/components/ItemWizard.tsx` | `useInfiniteQuery`, `useInfiniteScrollSentinel`, `ProductoRow`, `InfiniteScrollFooter`, debounce por fuente, reemplazo de `ScrollArea` |
| `src/types/cotizaciones.ts` | `producto_id_externo: string`, campo `url_producto` |
| `src/main.tsx` | `TooltipProvider` global |
| `package.json` / `src-tauri/tauri.conf.json` | Versión `1.1.0` |
| `docs/changelogs/v1.1.0.md` | Changelog de la release |
