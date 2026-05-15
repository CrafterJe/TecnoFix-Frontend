# feat(cotizaciones): modulo completo con configuracion y drag-and-drop — v1.0.0

## Motivación

Introducir el módulo de **cotizaciones** end-to-end en el frontend: desde el
listado y el wizard de creación hasta la configuración administrativa de
categorías, tipos de reparación y fórmulas de precio. Hasta esta versión el
módulo solo existía en el back; ahora el flujo completo es operable desde la
app, incluyendo generación de PDFs y reordenamiento de catálogos.

Con esta release la app pasa a ser **usable end-to-end** y por eso marcamos la
primera versión estable: **v1.0.0**.

---

## Resumen funcional

### Lo que ya puede hacer el usuario

| Rol | Acción |
|---|---|
| Cualquier autenticado | Listar, buscar y filtrar cotizaciones |
| Cualquier autenticado | Crear cotización (estado `borrador`) |
| Cualquier autenticado | Agregar items vía API de productos o manualmente |
| Cualquier autenticado | Cambiar estado: `borrador → finalizada / cancelada` |
| Cualquier autenticado | Generar PDF para cliente y PDF interno (empresa) |
| Admin | Configurar categorías y subcategorías de dispositivos |
| Admin | Configurar tipos de reparación por categoría |
| Admin | Configurar fórmulas de precio (con o sin subcategoría) |
| Admin | Reordenar categorías, subcategorías y tipos por drag-and-drop |
| Admin | Eliminar cotizaciones |

### Cómo se calculan los precios

El back resuelve la fórmula al agregar un item:

1. Busca una fórmula específica para `(tipo_reparacion, subcategoria)`.
2. Si no existe, usa la fórmula genérica `(tipo_reparacion, subcategoria=null)`.
3. Aplica multiplicador / incremento o evalúa la expresión personalizada sobre
   el precio base, y guarda el snapshot de la fórmula en el item.

---

## Cambios técnicos

### Frontend nuevo

| Archivo | Descripción |
|---|---|
| `src/features/cotizaciones/CotizacionesPage.tsx` | Layout raíz del módulo |
| `src/features/cotizaciones/CotizacionesListPage.tsx` | Listado con filtros y paginación |
| `src/features/cotizaciones/NuevaCotizacionPage.tsx` | Wizard de creación |
| `src/features/cotizaciones/CotizacionDetailPage.tsx` | Detalle con items y acciones |
| `src/features/cotizaciones/ConfiguracionPage.tsx` | Tabs de configuración admin |
| `src/features/cotizaciones/components/CotizacionSidebar.tsx` | Resumen lateral |
| `src/features/cotizaciones/components/EstadoBanner.tsx` | Banner de estado |
| `src/features/cotizaciones/components/ItemWizard.tsx` | Asistente para agregar items (API/manual) |
| `src/features/cotizaciones/components/config/CategoriasTab.tsx` | CRUD + DnD de categorías y subcategorías |
| `src/features/cotizaciones/components/config/TiposTab.tsx` | CRUD + DnD de tipos de reparación |
| `src/features/cotizaciones/components/config/FormulasTab.tsx` | CRUD de fórmulas |
| `src/features/cotizaciones/components/config/SortableItem.tsx` | Wrapper reutilizable de `@dnd-kit` |
| `src/features/cotizaciones/components/config/errorHelper.ts` | Extracción uniforme de errores del back |
| `src/api/cotizaciones.ts` | Capa API del módulo |
| `src/types/cotizaciones.ts` | Tipos del dominio |
| `docs/backend-docs/cotizaciones.md` | Referencia del back |
| `docs/changelogs/v1.0.0.md` | Changelog |

### Frontend modificado

| Archivo | Cambio |
|---|---|
| `src/router/index.tsx` | Rutas anidadas `/cotizaciones/*` |
| `src/types/index.ts` | Re-export de tipos de cotizaciones |
| `src/lib/config.ts` | Endpoints del módulo + endpoints `/reorder/` |
| `src/lib/helpers.ts` | Formateadores de moneda y fechas |
| `src/components/shared/PageHeader.tsx` | Soporta acciones derechas + descripción |
| `package.json` / `package-lock.json` | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| `package.json` / `src-tauri/tauri.conf.json` | Versión `1.0.0` |

---

## Drag-and-drop — detalles

El back expuso 3 endpoints bulk atómicos:

- `POST /api/v1/cotizaciones/categorias/reorder/` body `{ ids: number[] }`
- `POST /api/v1/cotizaciones/subcategorias/reorder/` body `{ categoria_id, ids }`
- `POST /api/v1/cotizaciones/tipos-reparacion/reorder/` body `{ categoria_id, ids }`

El front:

- Usa **optimistic update** con React Query (`onMutate` reordena el cache,
  `onError` revierte al snapshot previo).
- En el tab de Tipos, el DnD se **desactiva** cuando el filtro de categoría es
  "Todas" (el endpoint exige `categoria_id`); se muestra un hint para que el
  admin filtre antes de reordenar.
- `PointerSensor` con `activationConstraint: { distance: 5 }` para que un click
  en los botones de editar/eliminar no se confunda con un drag.
- Soporta teclado vía `KeyboardSensor` (accesibilidad).

---

## Plan de prueba

- [ ] Listar cotizaciones, paginar y filtrar por estado / año / mes / búsqueda.
- [ ] Crear cotización, cambiar a `finalizada` y a `cancelada` (transiciones).
- [ ] Agregar items en modo **API** y en modo **Manual** — verificar que el
      precio final aplica la fórmula correcta y el snapshot queda guardado.
- [ ] Generar PDFs (cliente y empresa).
- [ ] Crear/editar/eliminar categorías, subcategorías, tipos y fórmulas.
- [ ] **Drag-and-drop**:
  - [ ] Reordenar categorías → confirmar que el orden persiste tras recargar.
  - [ ] Reordenar subcategorías dentro de una categoría expandida.
  - [ ] Reordenar tipos con filtro por categoría aplicado.
  - [ ] Confirmar que el handle no se confunde con clicks en los botones.
  - [ ] Forzar error del back (p. ej. id inexistente) y validar que la UI
        revierte y muestra el toast con el detalle.
- [ ] Verificar que un usuario no-admin no puede acceder a `/cotizaciones/configuracion`.

---

## Versión

- `package.json` → `1.0.0`
- `src-tauri/tauri.conf.json` → `1.0.0`

Bump **major** (`0.2.6` → `1.0.0`) porque marca la primera release estable y
usable de TecnoFix end-to-end. Sin breaking changes en el front respecto a
versiones previas: el módulo es completamente aditivo.
