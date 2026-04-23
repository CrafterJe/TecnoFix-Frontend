# fix(installer): imágenes del instalador WiX y NSIS — v0.2.4

## Motivación

Tras revisar los instaladores generados en v0.2.3 se detectaron cuatro problemas:

1. La pantalla de bienvenida del `.msi` (WiX) aparecía en blanco — `dialogImagePath`
   seguía apuntando a `dialog.svg`, formato no soportado por WiX.
2. El banner del `.msi` solapaba el título de página — el bloque púrpura se posicionaba
   donde WiX dibuja su propio texto.
3. El header del `-setup.exe` (NSIS) tenía el logo a la derecha y el espacio en blanco
   a la izquierda, al revés de lo esperado.
4. El ícono del `TecnoFix_x64-setup.exe` mostraba el genérico de NSIS en lugar del logo
   de la app.

---

## Cambios

### `src-tauri/wix/dialog.bmp` (493×312)
- Renderizado desde los paths reales del SVG (`dialog.svg`).
- Panel izquierdo púrpura 164px con logo blanco/cian + "TecnoFix" (bold) +
  "Gestión para talleres" (cian claro) centrados; franja cian al pie del panel.
- Fondo blanco en los 329px derechos para el texto de bienvenida de WiX.

### `src-tauri/wix/banner.bmp` (493×58)
- Fondo completamente blanco — WiX dibuja su título de página en negro sobre él sin colisión.
- Logo original (púrpura + cian) + texto "TecnoFix" en púrpura solo en la franja derecha (x > 335).
- Línea cian de 3px al pie como acento.

### `src-tauri/nsis/header.bmp` (150×57)
- Bloque púrpura con logo a la **izquierda** (0–55px).
- Franja cian divisora (3px).
- "TecnoFix" en púrpura centrado en la zona blanca derecha (58–150px).

### `src-tauri/tauri.conf.json`
- `wix.dialogImagePath`: `dialog.svg` → `dialog.bmp`.
- `nsis.installerIcon`: añadido `"icons/icon.ico"`.
- Versión `0.2.3` → `0.2.4`.

### `package.json`
- Versión `0.2.3` → `0.2.4`.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src-tauri/wix/dialog.bmp` | rediseñado — panel púrpura izquierdo + blanco derecho |
| `src-tauri/wix/banner.bmp` | rediseñado — blanco + branding derecho sin solapamiento |
| `src-tauri/nsis/header.bmp` | logo a la izquierda + "TecnoFix" en zona blanca |
| `src-tauri/tauri.conf.json` | dialogImagePath → .bmp, installerIcon añadido, v0.2.4 |
| `package.json` | versión 0.2.4 |
| `docs/changelogs/v0.2.4.md` | changelog |
