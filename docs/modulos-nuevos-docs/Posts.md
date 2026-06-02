# Módulo "Diseños" — Descripción y análisis Front / Back

Documento de referencia para integrar este proyecto como **módulo/feature**
dentro de un proyecto anfitrión.

---

## 1. ¿Qué es el módulo?

Una herramienta para **crear publicaciones gráficas de Facebook/Instagram**
(formato retrato **1080 × 1350**) con la identidad visual de **Tecnofix**.

El usuario:

1. Elige el **tipo de publicación** (categoría).
2. Llena un **formulario** que se adapta a esa categoría.
3. Ve una **vista previa en vivo**.
4. Elige el **fondo** (el logo se cambia solo a blanco o color según el fondo).
5. **Descarga el PNG** en alta calidad (**2160 × 2700 px**, escala 2x).

Es, en esencia, un **"mini-Canva" específico de marca**: las plantillas,
colores, fuentes y logos ya están definidos para mantener consistencia.

### Categorías

| Categoría        | Campos                                                            |
|------------------|------------------------------------------------------------------|
| Dato curioso     | título, texto                                                    |
| Promoción/Oferta | etiqueta, título, subtítulo, precio anterior, precio, detalle    |
| Servicios        | etiqueta, título, lista de servicios                             |
| Tip / Consejo    | etiqueta, título, texto                                          |

---

## 2. Anatomía del código actual

| Archivo               | Rol                                                        | Naturaleza            |
|-----------------------|------------------------------------------------------------|-----------------------|
| `src/server.js`       | Servidor HTTP + exportación de PNG con Puppeteer           | **Backend (Node)**    |
| `src/templates.js`    | Genera el HTML de cada diseño a partir de un objeto JSON   | Lógica pura (universal)|
| `src/brand.js`        | Colores, fuentes, logos y lógica de logo claro/oscuro      | Lógica pura (universal)|
| `public/index.html`   | Interfaz del editor (HTML + CSS + JS vanilla)              | **Frontend**          |
| `assets/`             | Logos e íconos SVG/PNG (versión color y blanca)            | Recursos              |

**Dependencia única:** `puppeteer` (todo lo demás en `node_modules` son
sub-dependencias suyas).

### Contrato de datos (el objeto "design")

```js
{
  id: "nombre-archivo",
  category: "dato-curioso" | "promocion" | "servicios" | "tips",
  background: "purple" | "#RRGGBB" | { type:"gradient", from, to, angle },
  // campos según categoría:
  title, body, tag, product, oldPrice, price, items[], tipLabel
}
```

---

## 3. Análisis Front / Back

La pregunta clave es **qué DEBE estar en el backend y qué puede ir al front**.

| Pieza                              | ¿Necesita backend? | Motivo                                              |
|------------------------------------|--------------------|-----------------------------------------------------|
| Formulario / UI / chips de fondo   | ❌ Front           | Es interfaz pura                                    |
| `templates.js` (arma el HTML)      | ❌ Front           | Solo construye strings; corre en cualquier entorno  |
| `brand.js` (colores/fuentes/logo)  | ❌ Front           | Lógica pura, sin APIs de Node                       |
| Vista previa (`POST /preview`)     | ❌ Front           | Hoy va al servidor, pero es innecesario             |
| **Exportar PNG (`POST /download`)**| ⚠️ **Depende**     | Usa **Puppeteer = Chrome headless = solo Node**     |

### El único cuello de botella: la generación del PNG

Puppeteer **no corre en el navegador**: necesita Node con un Chromium.
Tal como está hoy, el endpoint `/download` **obliga a tener backend**.

Existen **dos caminos**:

#### Opción A — Módulo 100% Frontend (sin backend)

Reemplazar Puppeteer por captura en el cliente con **`html-to-image`** o
**`dom-to-image-more`**: el mismo HTML que genera `templates.js` se monta en
un nodo oculto del DOM y se "fotografía" a PNG.

- ✅ Cero servidor, cero Chromium (que pesa cientos de MB).
- ✅ Portátil: se integra en cualquier app frontend (React, Vue, etc.).
- ⚠️ La fidelidad depende del navegador del usuario.
- ⚠️ Hay que esperar a que las fuentes (Google Fonts) carguen antes de capturar.

#### Opción B — PNG en el Backend (mantener Puppeteer)

UI + `templates.js` + `brand.js` + preview en el front, y **solo** un endpoint
backend que recibe el JSON y devuelve el PNG con Puppeteer.

- ✅ Render **pixel-perfect** (Chrome real), idéntico en cualquier dispositivo.
- ⚠️ Requiere servidor Node con Chromium; más pesado de desplegar.

---

## 4. Recomendación de integración

> En **ambas opciones**, el primer paso es el mismo: **mover la vista previa al
> front** (que `templates.js` arme el HTML en el navegador en vez de hacer
> `POST /preview`). Eso elimina la mitad de la dependencia del servidor.

Luego, según el proyecto anfitrión:

- **Si ya tiene backend Node** (Express, Next.js API routes, etc.)
  → **Opción B**: deja solo la exportación de PNG en el backend (1 endpoint
  pequeño) y obtienes la mejor calidad. Todo lo demás al front.

- **Si quieres un módulo puramente frontend** (sin tocar servidor)
  → **Opción A** con `html-to-image`. Pierdes algo de fidelidad pero ganas
  portabilidad total.

### Reparto de archivos sugerido

```
Núcleo reutilizable (universal, va al front o se comparte):
  templates.js   → renderDesign(design) : string HTML
  brand.js       → colores, fuentes, logoFor(), isDarkBackground()

Frontend (UI del anfitrión):
  formulario + preview + botón de descarga
  (reemplaza index.html con la UI propia del proyecto)

Backend (SOLO si eliges Opción B):
  1 endpoint POST que recibe el design JSON y devuelve el PNG (Puppeteer)
```

---

## 5. Notas para el sidebar / nombre del módulo

Nombre sugerido para el sidebar: **"Diseños"** (consistente con la carpeta
`disenos/`), o **"Crear publicación"** si se prefiere enfoque a la acción.
