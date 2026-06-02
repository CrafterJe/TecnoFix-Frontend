# Backend — Endpoint `POST /publicaciones/exportar-png/`

Spec del único endpoint que necesita el módulo **Crear publicación** del front.
Recibe el objeto diseño (JSON) y devuelve la imagen **PNG 2160 × 2700 px**
(lienzo 1080 × 1350 a escala 2x) renderizada con Chromium headless.

El frontend ya hace todo lo demás (UI, formulario, vista previa). El back solo
debe convertir el JSON en una imagen **idéntica** a la vista previa.

---

## 1. Contrato del request

```
POST /api/v1/publicaciones/exportar-png/
Authorization: Bearer <access_token>     # autenticación JWT como el resto de la API
Content-Type: application/json
```

Body (objeto "diseño"):

```jsonc
{
  "id": "mi-publicacion",                 // nombre sugerido de archivo (sin extensión)
  "category": "dato-curioso",             // "dato-curioso" | "promocion" | "servicios" | "tips"
  "background": { "type": "gradient", "from": "purple", "to": "#1B1A40", "angle": 160 },
  // ↑ background también puede ser un string: "purple" | "cyan" | "#RRGGBB"

  // Campos según categoría (todos opcionales en el JSON; el front solo manda los que aplican):
  "title": "Dato Curioso",
  "body": "Texto del cuerpo…",
  "tag": "Promoción del mes",
  "product": "Para tu smartphone",
  "oldPrice": "$1,200",
  "price": "$899",
  "items": ["Servicio 1", "Servicio 2"],
  "tipLabel": "Tip TecnoFix"
}
```

### Campos por categoría

| category        | Campos usados                                            |
|-----------------|---------------------------------------------------------|
| `dato-curioso`  | `title`, `body`                                         |
| `promocion`     | `tag`, `title`, `product`, `oldPrice`, `price`, `body`  |
| `servicios`     | `tag`, `title`, `items[]`                               |
| `tips`          | `tipLabel`, `title`, `body`                             |

---

## 2. Contrato del response

- **200 OK**, `Content-Type: image/png`, body = bytes del PNG.
- Sugerido: `Content-Disposition: attachment; filename="<id>.png"` (el front igual
  lo guarda con su propio nombre, pero no estorba).
- **400** si `category` no es una de las 4 válidas.
- **401** si falta/expira el token (comportamiento estándar de la API).

El PNG debe medir **2160 × 2700** (porque `deviceScaleFactor = 2` sobre el
lienzo 1080 × 1350).

---

## 3. Cómo generar la imagen

El proyecto original usaba **Node + Puppeteer**. Como el backend es **Django
(Python)**, se reemplaza por **Playwright para Python** (mismo motor Chromium).

```bash
pip install playwright
playwright install chromium      # descarga el navegador una vez
```

El flujo del endpoint:

1. Validar `category`.
2. Construir el **HTML del diseño** (sección 4) a partir del JSON.
3. Lanzar Chromium headless, fijar viewport `1080 × 1350` con
   `device_scale_factor=2`, cargar el HTML, esperar a las fuentes y
   **screenshot** recortado al lienzo.
4. Devolver los bytes como `image/png`.

### Ejemplo de render (Playwright, síncrono)

```python
from playwright.sync_api import sync_playwright

CANVAS = {"width": 1080, "height": 1350}

def render_png(html: str) -> bytes:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        page = browser.new_page(
            viewport={"width": CANVAS["width"], "height": CANVAS["height"]},
            device_scale_factor=2,
        )
        page.set_content(html, wait_until="networkidle")
        page.evaluate("document.fonts.ready")
        png = page.screenshot(
            type="png",
            clip={"x": 0, "y": 0, "width": CANVAS["width"], "height": CANVAS["height"]},
        )
        browser.close()
        return png
```

> **Rendimiento / producción:**
> - Lanzar Chromium en cada request es costoso. Conviene mantener **un browser
>   compartido** (lanzarlo una vez al iniciar el worker y reusarlo, abriendo solo
>   una `page` nueva por request), igual que hacía el `server.js` original.
> - En async (ASGI / DRF async) usar `playwright.async_api`.
> - Asegurar que la imagen de despliegue tenga las **dependencias de Chromium**
>   (`playwright install-deps` o las libs del SO).
> - El `--no-sandbox` es típico en contenedores; ajústalo a tu entorno.

---

## 4. HTML del diseño (portar `templates.js` + `brand.js`)

La lógica es **pura** (construye un string HTML). Hay que reproducirla en Python
**carácter por carácter en el CSS y los tamaños** para que el PNG sea idéntico a
la vista previa del front. Las fuentes y colores ya están definidos.

### 4.1 Identidad visual (de `brand.js`)

```python
COLORS = {
    "purple": "#2D2B6E",   # principal
    "cyan":   "#02C5CE",   # acento
    "white":  "#FFFFFF",
    "cream":  "#F4F4FA",
    "ink":    "#1B1A40",   # texto sobre fondos claros
}

FONTS_LINK = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    '<link href="https://fonts.googleapis.com/css2?family=Anton&family=Nunito:'
    'ital,wght@0,400;0,600;0,700;0,800;0,900;1,700&display=swap" rel="stylesheet">'
)
FONT_TITLE = "'Anton', sans-serif"
FONT_BODY  = "'Nunito', sans-serif"
```

> Las fuentes vienen de **Google Fonts** (requiere salida a internet en el
> server). Si el server no tiene internet, descargar Anton + Nunito y servirlas
> con `@font-face` embebido. **Esperar `document.fonts.ready` antes del
> screenshot** es obligatorio para que el texto no salga con fuente fallback.

### 4.2 Logos

Los 4 SVG están en el repo del front en
[`src/features/publicaciones/assets/`](../../src/features/publicaciones/assets/):
`tecnofix.svg`, `tecnofix-blanco.svg`, `icono-tecnofix.svg`,
`icono-tecnofix-blanco.svg`. Cópialos al backend e incrústalos como **data URI**
base64 (igual que el front):

```python
import base64

def svg_data_uri(path: str) -> str:
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    return "data:image/svg+xml;base64," + b64
```

### 4.3 Selección de logo claro/oscuro (`isDarkBackground`)

```python
def is_dark_background(bg) -> bool:
    # Para gradientes usa el color "from" como referencia.
    ref = bg.get("from") if isinstance(bg, dict) else bg
    hex_ = (COLORS.get(ref, ref) or "").lstrip("#")
    if len(hex_) != 6:
        return True  # por defecto oscuro (caso degradado morado)
    r = int(hex_[0:2], 16); g = int(hex_[2:4], 16); b = int(hex_[4:6], 16)
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance < 0.5  # umbral 0.5: el cian (~0.548) usa logo de color

def logo_for(bg, variant="full") -> str:
    dark = is_dark_background(bg)
    files = {
        "full": {"normal": "tecnofix.svg",        "white": "tecnofix-blanco.svg"},
        "icon": {"normal": "icono-tecnofix.svg",  "white": "icono-tecnofix-blanco.svg"},
    }
    return svg_data_uri(ASSET_DIR / files[variant]["white" if dark else "normal"])
```

### 4.4 Fondo y color de texto

```python
def resolve_background(bg) -> str:
    if isinstance(bg, dict) and bg.get("type") == "gradient":
        frm = COLORS.get(bg.get("from"), bg.get("from")) or COLORS["purple"]
        to  = COLORS.get(bg.get("to"),   bg.get("to"))   or COLORS["ink"]
        angle = bg.get("angle", 160)
        return f"linear-gradient({angle}deg, {frm} 0%, {to} 100%)"
    name = bg if isinstance(bg, str) else ""
    return COLORS.get(name, name) or COLORS["purple"]

def base_text_color(bg) -> str:
    return COLORS["white"] if is_dark_background(bg) else COLORS["ink"]
```

### 4.5 Escape y multilínea

```python
import html as _html
def esc(t):       return _html.escape(str(t or ""), quote=False)
def multiline(t): return esc(t).replace("\n", "<br>")
```

### 4.6 Plantillas por categoría

Reproducir **exactamente** la estructura de cada categoría. Referencia
autoritativa: [`src/features/publicaciones/lib/templates.ts`](../../src/features/publicaciones/lib/templates.ts).
Resumen de la estructura interna (`<div class="canvas">…</div>`):

**dato-curioso**
```html
<div class="content dato">
  <h1 class="title" style="color:{text}">{multiline(title)}</h1>
  <div class="accent-line" style="background:{cyan}"></div>
  <p class="body" style="color:{text}">{multiline(body)}</p>
</div>
<div class="footer"><img class="logo" src="{logo}" alt="TecnoFix" style="width:250px"></div>
```

**promocion**
```html
<div class="content promo">
  <span class="tag" style="background:{cyan};color:{white}">{tag or "PROMOCIÓN"}</span>
  <h1 class="title promo-title" style="color:{text}">{multiline(title)}</h1>
  <!-- si product: --> <p class="promo-product" style="color:{cyan}">{multiline(product)}</p>
  <div class="price-wrap">
    <!-- si oldPrice: --> <span class="old-price" style="color:{text}">{oldPrice}</span>
    <span class="price" style="background:{cyan};color:{purple}">{price}</span>
  </div>
  <!-- si body: --> <p class="body" style="color:{text}">{multiline(body)}</p>
</div>
<div class="footer">…logo…</div>
```

**servicios** (cada item es un `<li>`)
```html
<div class="content servicios">
  <span class="tag" style="background:{cyan};color:{white}">{tag or "NUESTROS SERVICIOS"}</span>
  <h1 class="title" style="color:{text}">{multiline(title)}</h1>
  <ul class="service-list">
    <!-- por cada item: -->
    <li class="service-item" style="color:{text}">
      <span class="bullet" style="background:{cyan}"></span>
      <span>{multiline(item)}</span>
    </li>
  </ul>
</div>
<div class="footer">…logo…</div>
```

**tips**
```html
<div class="content tips">
  <div class="tip-badge" style="background:{cyan};color:{purple}">{tipLabel or "TIP"}</div>
  <h1 class="title" style="color:{text}">{multiline(title)}</h1>
  <div class="accent-line" style="background:{cyan}"></div>
  <p class="body" style="color:{text}">{multiline(body)}</p>
</div>
<div class="footer">…logo…</div>
```

### 4.7 CSS (copiar tal cual — define todos los tamaños)

```css
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:1080px; height:1350px; }
.canvas {
  width:1080px; height:1350px; position:relative; overflow:hidden;
  display:flex; flex-direction:column; padding:110px 90px 70px;
  font-family:'Nunito', sans-serif;
}
.content { flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; gap:34px; }
.title { font-family:'Anton', sans-serif; font-weight:400; line-height:1.02; letter-spacing:1px; text-transform:uppercase; font-size:120px; }
.body  { font-family:'Nunito', sans-serif; font-weight:800; font-size:46px; line-height:1.4; max-width:880px; }
.accent-line { width:140px; height:10px; border-radius:6px; }
.footer { display:flex; justify-content:center; align-items:flex-end; padding-top:30px; }
.logo { height:auto; display:block; }
.tag { font-family:'Nunito', sans-serif; font-weight:900; font-size:30px; letter-spacing:3px; padding:14px 30px; border-radius:999px; text-transform:uppercase; }
.dato .title { font-size:130px; }
.promo .promo-title { font-size:96px; }
.promo-product { font-family:'Nunito', sans-serif; font-weight:900; font-size:54px; }
.price-wrap { display:flex; align-items:center; gap:28px; }
.price { font-family:'Anton', sans-serif; font-size:130px; line-height:1; padding:18px 44px; border-radius:24px; }
.old-price { font-family:'Nunito', sans-serif; font-weight:800; font-size:60px; text-decoration:line-through; opacity:.6; }
.servicios .title { font-size:92px; }
.service-list { list-style:none; display:flex; flex-direction:column; gap:30px; width:100%; max-width:840px; }
.service-item { display:flex; align-items:center; gap:26px; text-align:left; font-family:'Nunito', sans-serif; font-weight:800; font-size:48px; line-height:1.2; }
.bullet { width:26px; height:26px; border-radius:8px; flex:0 0 auto; transform:rotate(45deg); }
.tip-badge { font-family:'Anton', sans-serif; font-size:44px; letter-spacing:2px; padding:16px 40px; border-radius:18px; text-transform:uppercase; }
.tips .title { font-size:104px; }
```

### 4.8 Documento final

```python
def render_design(design: dict) -> str:
    category = design.get("category")
    if category not in ("dato-curioso", "promocion", "servicios", "tips"):
        raise ValueError(f"Categoría desconocida: {category!r}")
    bg = resolve_background(design.get("background"))
    inner = build_inner(design)   # según category (sección 4.6)
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8">{FONTS_LINK}<style>{STYLES}</style></head>
<body><div class="canvas" style="background:{bg}">{inner}</div></body>
</html>"""
```

---

## 5. Checklist de aceptación

- [ ] `POST /publicaciones/exportar-png/` con JWT válido devuelve `image/png`.
- [ ] El PNG mide **2160 × 2700 px**.
- [ ] Las 4 categorías renderizan igual que la vista previa del front.
- [ ] El logo se vuelve **blanco** en fondos oscuros y **color** en claros.
- [ ] Gradientes y colores hex/paleta funcionan en `background`.
- [ ] `category` inválida → **400**.
- [ ] Las fuentes Anton/Nunito aparecen (no fallback) — se espera
      `document.fonts.ready` antes del screenshot.
- [ ] (Producción) Chromium se reutiliza entre requests; deps del SO instaladas.

> **Tip de verificación:** abre la vista previa en el front con un diseño,
> exporta el PNG y compáralos. Deben ser visualmente idénticos (el preview es el
> mismo HTML escalado).
