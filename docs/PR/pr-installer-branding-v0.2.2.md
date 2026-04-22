# chore(installer): branding de íconos e imágenes del instalador — v0.2.2

## Motivación

Al descargar `TecnoFix_x64-setup.exe` desde Releases se observaron tres problemas de branding en Windows:

1. **Ícono genérico de Tauri** en el ejecutable y accesos directos — el `icon.ico` nunca fue regenerado desde el logo propio de TecnoFix, solo se había dejado el boilerplate.
2. **Instalador NSIS con diseño por defecto** — sin sidebar ni header personalizados, se veía como un instalador genérico sin marca.
3. **Instalador WiX con banner glitcheado** — `tauri.conf.json` apuntaba a `wix/banner.bmp` y `wix/dialog.bmp` pero en el repo solo había `.svg`. WiX solo acepta BMP, así que renderizaba basura.

Adicionalmente, tras el primer intento de fix, el header NSIS colisionaba con el título de página que NSIS dibuja encima (`Destination Folder`, etc.), dejando texto ilegible. Se rediseñó con fondo blanco a la izquierda (zona del título) + bloque púrpura a la derecha con el logo.

---

## Cambios

### `src-tauri/icons/**`
- Todos los íconos (`icon.ico`, `icon.icns`, PNGs de Windows/iOS/Android) regenerados con `npm run tauri icon src-tauri/icons/icon.png` a partir del logo TecnoFix existente.

### `src-tauri/nsis/sidebar.bmp` (nuevo, 164×314)
- Imagen lateral de la pantalla de bienvenida/finalización del instalador NSIS.
- Fondo púrpura `#2D2B6E` + franjas cian `#02C5CE` arriba y abajo.
- Logo blanco/cian (paths reales del SVG) centrado en la parte superior.
- Texto "TecnoFix" + subtítulo "Gestión para talleres" al pie.

### `src-tauri/nsis/header.bmp` (nuevo, 150×57)
- Header mostrado en las páginas internas del wizard NSIS.
- **Lado izquierdo blanco** para que NSIS dibuje su título de página (`Destination Folder`, `Installing`, etc.) en negro legible.
- **Lado derecho púrpura** con el logo + franja cian divisoria.
- Sin texto propio (NSIS aporta el título).

### `src-tauri/wix/banner.bmp` (nuevo, 493×58)
- Banner del instalador WiX/MSI, mismo patrón: lado izquierdo blanco para el título MSI + lado derecho púrpura con logo + "TecnoFix".
- Reemplaza el `banner.svg` huérfano que WiX no puede leer.

### `src-tauri/wix/dialog.bmp` (nuevo, 493×312)
- Imagen de la pantalla de bienvenida/finalización del instalador WiX.
- Fondo púrpura completo con logo grande centrado + marca al pie.

### `src-tauri/tauri.conf.json`
- Se añadió la sección `bundle.windows.nsis` con `installerSidebarImage` y `installerHeaderImage` apuntando a los nuevos BMPs.
- Versión `0.2.1` → `0.2.2`.

### `src-tauri/wix/dialog.svg`
- Se eliminó el elemento `<text>v0.1.4</text>` (versión obsoleta hardcodeada). El archivo se conserva solo como fuente de diseño.

### `package.json`
- Versión `0.2.1` → `0.2.2`.

---

## Detalle técnico — renderizado del logo

Los BMPs no se dibujaron con rectángulos aproximados. Se parsearon los dos `<path>` reales del SVG (`dist/tecnofix.svg`) y se renderizaron con GDI+ (`System.Drawing.Drawing2D.GraphicsPath` + `AddPolygon`) aplicando un `Matrix.Scale()` para adaptar al tamaño de cada imagen. El path "púrpura" se repinta en **blanco** cuando el fondo es púrpura para mantener contraste; el path "cian" conserva su color original.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src-tauri/icons/**` | regenerados desde `icon.png` con `tauri icon` |
| `src-tauri/nsis/sidebar.bmp` | nuevo (164×314) |
| `src-tauri/nsis/header.bmp` | nuevo (150×57) — layout blanco/púrpura |
| `src-tauri/wix/banner.bmp` | nuevo (493×58) — layout blanco/púrpura |
| `src-tauri/wix/dialog.bmp` | nuevo (493×312) |
| `src-tauri/tauri.conf.json` | NSIS config + versión 0.2.2 |
| `src-tauri/wix/dialog.svg` | removido texto `v0.1.4` |
| `package.json` | versión 0.2.2 |
| `docs/changelogs/v0.2.2.md` | changelog |
| `docs/PR/pr-installer-branding-v0.2.2.md` | este documento |

## Cómo verificar

1. `npm run tauri build` → genera `TecnoFix_0.2.2_x64-setup.exe` (NSIS) y `TecnoFix_0.2.2_x64_en-US.msi` (WiX).
2. Verificar en el Explorador de Windows que ambos instaladores y el `.exe` final muestran el logo TecnoFix (no el ícono "x" genérico).
3. Ejecutar el `.exe` NSIS:
   - Pantalla de bienvenida: sidebar con logo grande, marca al pie.
   - Páginas internas (`Destination Folder`, `Installing`): header con título de NSIS en negro sobre blanco + logo sobre púrpura a la derecha, **sin solapamiento**.
4. Ejecutar el `.msi` WiX:
   - Banner en cada página: título MSI legible a la izquierda, marca TecnoFix a la derecha.
   - Pantallas de inicio/fin: imagen `dialog` con logo centrado.
5. Confirmar que el ícono de la app ya instalada (en Inicio / barra de tareas) es el logo TecnoFix, no el genérico.
