# feat(publicaciones): módulo "Crear publicación" (mini-Canva de marca) — v1.3.0

## Motivación

Dar a **todos los roles** una herramienta para generar publicaciones gráficas de
Facebook / Instagram (retrato **1080 × 1350**) con la identidad visual de
TecnoFix, sin salir de la app y sin depender de Canva u otras herramientas
externas. Es un *mini-Canva de marca*: plantillas, colores, fuentes y logos ya
definidos para mantener consistencia.

El módulo nace de un proyecto independiente (Node + Puppeteer). Se integra como
feature del front siguiendo la **Opción B**: toda la UI, el formulario, la
identidad visual y la vista previa viven en el front; **solo la exportación a
PNG** queda en el backend.

---

## Resumen funcional

| Rol | Acción |
|---|---|
| Cualquier autenticado | Elegir tipo de publicación (4 categorías) |
| Cualquier autenticado | Llenar formulario adaptativo por categoría |
| Cualquier autenticado | Ver vista previa en vivo (local, sin red) |
| Cualquier autenticado | Elegir fondo (logo claro/oscuro automático) |
| Cualquier autenticado | Descargar el PNG en alta calidad (2160 × 2700) |

**Categorías:** Dato curioso · Promoción/Oferta · Servicios · Tip/Consejo.
**Fondos:** degradado morado/azul · morado · cian · crema · blanco.

---

## Cambios técnicos

### Frontend nuevo

| Archivo | Descripción |
|---|---|
| `src/features/publicaciones/CrearPublicacionPage.tsx` | UI: formulario + vista previa + descarga |
| `src/features/publicaciones/schema.ts` | Campos por categoría + opciones de fondo |
| `src/features/publicaciones/lib/brand.ts` | Puerto TS de `brand.js` (colores, fuentes, logos data URI, claro/oscuro) |
| `src/features/publicaciones/lib/templates.ts` | Puerto TS de `templates.js` → `renderDesign(design): string` |
| `src/features/publicaciones/assets/*.svg` | 4 logos (TECNOFIX color/blanco, ICONO color/blanco) para el preview |
| `src/api/publicaciones.ts` | `exportarPng(design): Promise<Blob>` |
| `src/types/publicaciones.ts` | Tipos del dominio (`DisenoPublicacion`, etc.) |
| `src/lib/download.ts` | `saveBlob()` reutilizable (Tauri save dialog / `<a download>`) |
| `docs/publicaciones/doc-feat-crear-publicacion.md` | Documentación del módulo front |
| `docs/backend-docs/publicaciones-exportar-png.md` | Spec del endpoint del backend |
| `docs/changelogs/v1.3.0.md` | Changelog |

### Frontend modificado

| Archivo | Cambio |
|---|---|
| `src/components/layout/Sidebar.tsx` | Ítem "Crear publicación" (ícono `ImagePlus`, sin restricción de rol) |
| `src/router/index.tsx` | Ruta `/publicaciones` dentro del `Layout` protegido |
| `src/lib/config.ts` | `ENDPOINTS.publicaciones.exportarPng` |
| `src/types/index.ts` | Re-export de tipos de publicaciones |
| `package.json` / `src-tauri/tauri.conf.json` | Versión `1.3.0` |

---

## Decisiones técnicas

- **El backend de TecnoFix es Django (Python), no Node**, así que `server.js` del
  proyecto original **no se reutiliza**. La generación del HTML (`templates.js` +
  `brand.js`) se portó a TS en el front y debe portarse a Python en el back, que
  renderiza el PNG con **Playwright** (Chromium headless, escala 2x).
- **Logos como data URI en el navegador**: se importan con Vite `?raw` y se
  codifican base64 UTF-8 (`TextEncoder` + `btoa`), reemplazando el `readFileSync`
  de Node. Así funcionan dentro del `srcDoc` del iframe sin rutas relativas.
- **Vista previa local**: `renderDesign` corre en el browser (el original hacía
  `POST /preview`). Solo se diferiere 250 ms el `srcDoc` para no recargar las
  Google Fonts del iframe en cada tecla.
- **`saveBlob` reutilizable**: extrae el patrón ya probado en `PdfPreviewDialog`.
  No requiere permisos nuevos de Tauri (`plugin-fs/dialog/opener` ya configurados).

---

## Plan de prueba

- [ ] El ítem "Crear publicación" aparece en el sidebar para los 3 roles.
- [ ] Cambiar de categoría reinicia los campos a los valores por defecto correctos.
- [ ] La vista previa refleja título, texto, etiqueta, precios, items y tip.
- [ ] Cambiar de fondo cambia el color de fondo y el logo (blanco/color).
- [ ] `items` (servicios) se parte por líneas y renderiza una viñeta por línea.
- [ ] Descargar PNG en **web**: descarga directa con el nombre del archivo.
- [ ] Descargar PNG en **Tauri/Windows**: abre "Guardar como…" y el toast "Abrir".
- [ ] El PNG descargado mide 2160 × 2700 y coincide con la vista previa.
- [ ] (Cuando exista el endpoint) error del back → toast "No se pudo generar la imagen".

> Nota: la descarga requiere el endpoint del backend
> (`POST /publicaciones/exportar-png/`). Hasta que exista, la UI y la vista previa
> son completamente probables; el botón Descargar fallará con el toast de error.

---

## Versión

- `package.json` → `1.3.0`
- `src-tauri/tauri.conf.json` → `1.3.0`

Bump **minor** (`1.2.0` → `1.3.0`): feature aditiva, sin breaking changes.
