# feat(cotizaciones): scroll infinito en búsqueda de productos — v1.1.0

## Motivación

El `ItemWizard` mostraba máximo 20 productos sin forma de ver el resto. Al buscar
un componente muy genérico (ej. "cable") el usuario veía solo la primera página y
tenía que refinar la búsqueda manualmente en lugar de seguir cargando. Esta PR
implementa scroll infinito en ambos listados del wizard (búsqueda por fuente y
búsqueda global) y aprovecha el refactor para mejorar accesibilidad y agregar el
enlace al sitio del proveedor.

---

## Cambios

### `src/features/cotizaciones/components/ItemWizard.tsx`

- `useQuery` → `useInfiniteQuery` en las queries de productos por fuente y global.
  `getNextPageParam` lee `last.next` (URL de página siguiente del backend) y
  `last.current_page` para calcular el número de página.
- Nuevo hook `useInfiniteScrollSentinel`: encapsula `IntersectionObserver` con
  `rootMargin: "100px"` para prefetch suave; se desconecta durante fetches en curso.
- `ScrollArea` reemplazado por `div` con `overflow-y-auto` (el viewport interno de
  Radix desacopla el scroll y el sentinel nunca entra al campo de visión del observer).
- Nuevo componente `ProductoRow`: fila accesible con teclado (Enter/Space),
  `focus-visible`, tooltip en título truncado e ícono `ExternalLink` cuando
  `url_producto` está presente.
- Nuevo componente `InfiniteScrollFooter`: sentinel + spinner de carga + mensaje
  "No hay más resultados".
- Contador "Mostrando X de Y" visible en ambos listados.
- Debounce de búsqueda por fuente añadido (300 ms, igual que búsqueda global).
- Tamaño de página aumentado de 20 a 30 ítems.

### `src/types/cotizaciones.ts`

- `producto_id_externo`: `number` → `string` (el backend puede devolver IDs con
  letras o guiones según el proveedor).
- Campo `url_producto: string` añadido (nuevo campo del backend).

### `src/main.tsx`

- `TooltipProvider` global con `delayDuration={500}` registrado en la raíz de la
  app para que los tooltips funcionen en cualquier parte sin instancias aisladas.

---

## Plan de prueba

- [ ] Buscar un término genérico en búsqueda por fuente y verificar que al llegar
      al final de la lista se cargan automáticamente más productos.
- [ ] Verificar contador "Mostrando X de Y" refleja correctamente el total.
- [ ] Buscar en búsqueda global y confirmar el mismo comportamiento de scroll infinito.
- [ ] Verificar que el mensaje "No hay más resultados" aparece al agotar las páginas.
- [ ] Verificar que el ícono `ExternalLink` aparece en productos con `url_producto`
      y abre el enlace sin cerrar el wizard.
- [ ] Navegar el listado con teclado (Tab + Enter/Space) y confirmar que la selección funciona.
- [ ] Pasar el ratón sobre un título largo y confirmar que el tooltip muestra el nombre completo.
- [ ] Confirmar que el debounce de búsqueda por fuente no dispara peticiones en cada letra.

---

## Versión

- `package.json` → `1.1.0`
- `src-tauri/tauri.conf.json` → `1.1.0`

Bump **minor** (`1.0.0` → `1.1.0`): mejora funcional aditiva, sin breaking changes.
