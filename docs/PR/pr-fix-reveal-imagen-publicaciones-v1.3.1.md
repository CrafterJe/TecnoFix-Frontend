# fix(publicaciones): abrir ubicación de la imagen descargada en Windows — v1.3.1

## Motivación

En el módulo **Crear publicación**, al descargar el PNG en la app de Windows, el
toast "Archivo guardado" mostraba una acción **"Abrir"**. Al pulsarla aparecía el
error _"No se pudo abrir el archivo"_.

La acción llamaba `openPath(filePath)`, que intenta abrir la imagen con su
aplicación por defecto. En `tauri-plugin-opener` el comando `open_path` se valida
contra un *scope* de rutas; sin ese scope configurado, la llamada se rechaza en el
layer de permisos de Tauri (no a nivel de SO — un PNG existente prácticamente nunca
falla al abrirse en Windows). Como publicaciones (v1.3.0) es la función más nueva,
fue la primera vez que se ejerció ese botón.

Para una imagen, además, lo natural no es abrirla en un visor sino **ver dónde
quedó guardada**.

---

## Cambios

### `src/lib/download.ts`
- La acción del toast de `saveBlob()` pasa de **"Abrir"** (`openPath`) a
  **"Ver en carpeta"** (`revealItemInDir`), que abre el Explorador de Windows con
  el archivo seleccionado. Funciona para cualquier tipo de archivo y no depende de
  la app por defecto ni del scope de `open_path`.

### `src-tauri/capabilities/default.json`
- Añadido el permiso `opener:allow-reveal-item-in-dir`, requerido por el nuevo
  comando.

### Versión
- `package.json` y `src-tauri/tauri.conf.json` → `1.3.1`.

> El visor de PDF de cotizaciones (`PdfPreviewDialog`) mantiene su acción "Abrir"
> a propósito: para un PDF sí interesa abrirlo en el visor, no solo localizarlo.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/download.ts` | toast: `openPath` → `revealItemInDir` ("Ver en carpeta") |
| `src-tauri/capabilities/default.json` | permiso `opener:allow-reveal-item-in-dir` |
| `package.json` | versión 1.3.1 |
| `src-tauri/tauri.conf.json` | versión 1.3.1 |
| `docs/changelogs/v1.3.1.md` | changelog |
| `docs/publicaciones/doc-feat-crear-publicacion.md` | nota de descarga actualizada |

---

## Build / prueba

> ⚠️ Cambia un permiso de Tauri: requiere recompilar el lado Rust.

```bash
npm run tauri dev      # o el build de Windows
```

1. Ir a **Crear publicación** → llenar un diseño → **Descargar PNG**.
2. En el diálogo nativo elegir ubicación y guardar.
3. En el toast pulsar **"Ver en carpeta"** → se abre el Explorador con el PNG
   seleccionado.
