# fix(installer): banner.svg sincronizado con banner.bmp — v0.2.5

## Motivación

En el instalador WiX (`_en-US.msi`) el banner superior mostraba el diseño antiguo: fondo
púrpura completo con "TecnoFix" y subtítulo en blanco. Esto causaba que el título de
página que WiX dibuja encima ("Change, repair or remove installation", "Destination
Folder", etc.) fuera ilegible por solapamiento de colores y texto.

El `banner.bmp` ya tenía el diseño correcto (fondo blanco + branding derecha) pero el
build WiX usaba `banner.svg` en su lugar. Se actualizó `banner.svg` para que coincida
con `banner.bmp`.

---

## Cambios

### `src-tauri/wix/banner.svg`
- Fondo: púrpura completo → **blanco**.
- Texto y subtítulo eliminados del área izquierda.
- Logo original (`#2D2B6E` + `#02C5CE`) y "TecnoFix" en púrpura solo en franja derecha (x > 335).
- Línea cian de 3px al pie como acento.

### Versión
- `package.json` y `src-tauri/tauri.conf.json` → `0.2.5`.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src-tauri/wix/banner.svg` | rediseñado — blanco + branding derecha |
| `src-tauri/tauri.conf.json` | versión 0.2.5 |
| `package.json` | versión 0.2.5 |
| `docs/changelogs/v0.2.5.md` | changelog |
