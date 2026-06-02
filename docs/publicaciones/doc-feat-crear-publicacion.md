# Módulo "Crear publicación" — Documentación frontend

Herramienta tipo *mini-Canva de marca* para generar publicaciones gráficas de
Facebook / Instagram (retrato **1080 × 1350**) con la identidad visual de
TecnoFix. Disponible para **todos los roles** en el sidebar.

---

## Flujo de usuario

1. Elige el **tipo de publicación** (categoría).
2. Llena el **formulario** que se adapta a esa categoría.
3. Ve la **vista previa en vivo** (se genera localmente, sin red).
4. Elige el **fondo** (el logo cambia solo a blanco/color según el fondo).
5. **Descarga el PNG** en alta calidad (**2160 × 2700 px**, escala 2x).

### Categorías y campos

| Categoría        | Campos                                                            |
|------------------|------------------------------------------------------------------|
| Dato curioso     | título, texto                                                    |
| Promoción/Oferta | etiqueta, título, subtítulo, precio anterior, precio, detalle    |
| Servicios        | etiqueta, título, lista de servicios (uno por línea)            |
| Tip / Consejo    | etiqueta, título, texto                                          |

### Fondos disponibles

Degradado morado · Morado · Degradado azul · Cian · Crema · Blanco.
El logo se elige automáticamente por luminancia del fondo
(`isDarkBackground` en [brand.ts](../../src/features/publicaciones/lib/brand.ts)).

---

## Arquitectura (Opción B: PNG en el backend)

El módulo original (Node + Puppeteer) se reparte así:

| Pieza | Dónde vive en TecnoFix |
|-------|------------------------|
| UI, formulario, chips de fondo | Front — [`CrearPublicacionPage.tsx`](../../src/features/publicaciones/CrearPublicacionPage.tsx) |
| Definición de campos y fondos | Front — [`schema.ts`](../../src/features/publicaciones/schema.ts) |
| Identidad visual (colores, fuentes, logos) | Front — [`lib/brand.ts`](../../src/features/publicaciones/lib/brand.ts) |
| Generación del HTML del diseño | Front (vista previa) — [`lib/templates.ts`](../../src/features/publicaciones/lib/templates.ts) |
| **Exportación a PNG** | **Backend Django + Playwright** (ver abajo) |

> **Importante:** el backend de TecnoFix es **Django (Python)**, no Node, por lo
> que `server.js` del proyecto original **no se reutiliza**. La lógica de
> `templates.js` + `brand.js` se **porta a Python** y se renderiza con
> **Playwright para Python** (Chromium headless, escala 2x). Spec completa en
> [`docs/backend-docs/publicaciones-exportar-png.md`](../backend-docs/publicaciones-exportar-png.md).

---

## Archivos del frontend

### Nuevos

| Archivo | Rol |
|---------|-----|
| `src/features/publicaciones/CrearPublicacionPage.tsx` | UI: formulario + preview + descarga |
| `src/features/publicaciones/schema.ts` | Campos por categoría + opciones de fondo |
| `src/features/publicaciones/lib/brand.ts` | Puerto TS de `brand.js`; logos vía import Vite `?raw` → data URI |
| `src/features/publicaciones/lib/templates.ts` | Puerto TS de `templates.js`; `renderDesign(design): string` |
| `src/features/publicaciones/assets/*.svg` | 4 logos (TECNOFIX color/blanco, ICONO color/blanco) para el preview |
| `src/api/publicaciones.ts` | `exportarPng(design): Promise<Blob>` |
| `src/types/publicaciones.ts` | `DisenoPublicacion`, `CategoriaPublicacion`, `FondoPublicacion`, … |
| `src/lib/download.ts` | `saveBlob()` reutilizable (Tauri save dialog / `<a download>` web) |

### Modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/Sidebar.tsx` | Ítem "Crear publicación" (ícono `ImagePlus`, sin restricción de rol) |
| `src/router/index.tsx` | Ruta `/publicaciones` dentro del `Layout` protegido |
| `src/lib/config.ts` | `ENDPOINTS.publicaciones.exportarPng` |
| `src/types/index.ts` | Re-export de tipos de publicaciones |

---

## Decisiones técnicas

1. **Logos como data URI en el front**: en Node se leían con `readFileSync`; en
   el navegador se importan con Vite `?raw` y se codifican a base64 UTF-8 con
   `TextEncoder` + `btoa`. Así el `<img src>` funciona dentro del `srcDoc` del
   iframe sin depender de rutas relativas.
2. **Preview local, sin red**: a diferencia del original (que hacía
   `POST /preview`), `renderDesign` corre en el navegador. Solo se diferiere
   250 ms el `srcDoc` para no recargar las Google Fonts del iframe en cada tecla.
3. **Descarga reutilizable**: `saveBlob` extrae el patrón ya probado en
   `PdfPreviewDialog` (diálogo nativo en Tauri + toast "Abrir", `<a download>` en
   web). No requiere permisos nuevos: las capabilities de `plugin-fs`,
   `plugin-dialog` y `plugin-opener` ya están configuradas.
4. **Contrato compartido**: el objeto `DisenoPublicacion` es idéntico al "design"
   del proyecto original, para que el preview del front y el render del back
   produzcan exactamente el mismo resultado.

---

## Dependencia del backend

Requiere `POST /api/v1/publicaciones/exportar-png/` que reciba el objeto diseño
y devuelva el PNG. Spec e instrucciones de implementación en
[`docs/backend-docs/publicaciones-exportar-png.md`](../backend-docs/publicaciones-exportar-png.md).
