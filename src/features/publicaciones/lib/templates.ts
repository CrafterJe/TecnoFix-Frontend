// templates.ts — Genera el HTML de cada diseño 1080x1350 según su categoría.
//
// Puerto a TypeScript de templates.js (lógica pura, sin APIs de Node). El mismo
// HTML se usa para la vista previa (iframe) en el front; el backend porta esta
// misma lógica a Python para exportar el PNG pixel-perfect con Playwright.
import type { DisenoPublicacion, FondoPublicacion } from "@/types";
import {
  COLORS,
  CANVAS,
  FONTS_LINK,
  FONT_TITLE,
  FONT_BODY,
  logoFor,
  isDarkBackground,
} from "./brand";

// --- Helpers ---------------------------------------------------------------

// Resuelve el CSS de fondo a partir de la definición del diseño.
function resolveBackground(bg: FondoPublicacion | undefined): string {
  if (bg && typeof bg === "object" && bg.type === "gradient") {
    const from = COLORS[bg.from] || bg.from || COLORS.purple;
    const to = COLORS[bg.to] || bg.to || COLORS.ink;
    const angle = bg.angle ?? 160;
    return `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
  }
  const name = typeof bg === "string" ? bg : "";
  return COLORS[name] || name || COLORS.purple;
}

// Color de texto base según claridad del fondo.
function baseTextColor(bg: FondoPublicacion | undefined): string {
  return isDarkBackground(bg) ? COLORS.white : COLORS.ink;
}

// Escapa texto y convierte \n en saltos de línea.
function esc(text: string = ""): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function multiline(text: string = ""): string {
  return esc(text).replace(/\n/g, "<br>");
}

// --- Bloques reutilizables -------------------------------------------------

function logoBlock(design: DisenoPublicacion, { size = 250 }: { size?: number } = {}): string {
  const src = logoFor(design.background, "full");
  return `<img class="logo" src="${src}" alt="TecnoFix" style="width:${size}px">`;
}

// Etiqueta/categoría tipo "píldora" arriba del diseño.
function tag(text: string, accent: string): string {
  return `<span class="tag" style="background:${accent};color:${COLORS.white}">${esc(text)}</span>`;
}

// --- Plantillas por categoría ---------------------------------------------

function datoCurioso(d: DisenoPublicacion): string {
  const text = baseTextColor(d.background);
  return `
    <div class="content dato">
      <h1 class="title" style="color:${text}">${multiline(d.title)}</h1>
      <div class="accent-line" style="background:${COLORS.cyan}"></div>
      <p class="body" style="color:${text}">${multiline(d.body)}</p>
    </div>
    <div class="footer">${logoBlock(d)}</div>
  `;
}

function promocion(d: DisenoPublicacion): string {
  const text = baseTextColor(d.background);
  return `
    <div class="content promo">
      ${tag(d.tag || "PROMOCIÓN", COLORS.cyan)}
      <h1 class="title promo-title" style="color:${text}">${multiline(d.title)}</h1>
      ${d.product ? `<p class="promo-product" style="color:${COLORS.cyan}">${multiline(d.product)}</p>` : ""}
      <div class="price-wrap">
        ${d.oldPrice ? `<span class="old-price" style="color:${text}">${esc(d.oldPrice)}</span>` : ""}
        <span class="price" style="background:${COLORS.cyan};color:${COLORS.purple}">${esc(d.price)}</span>
      </div>
      ${d.body ? `<p class="body" style="color:${text}">${multiline(d.body)}</p>` : ""}
    </div>
    <div class="footer">${logoBlock(d)}</div>
  `;
}

function servicios(d: DisenoPublicacion): string {
  const text = baseTextColor(d.background);
  const items = (d.items || [])
    .map(
      (it) => `
      <li class="service-item" style="color:${text}">
        <span class="bullet" style="background:${COLORS.cyan}"></span>
        <span>${multiline(it)}</span>
      </li>`,
    )
    .join("");
  return `
    <div class="content servicios">
      ${tag(d.tag || "NUESTROS SERVICIOS", COLORS.cyan)}
      <h1 class="title" style="color:${text}">${multiline(d.title)}</h1>
      <ul class="service-list">${items}</ul>
    </div>
    <div class="footer">${logoBlock(d)}</div>
  `;
}

function tips(d: DisenoPublicacion): string {
  const text = baseTextColor(d.background);
  return `
    <div class="content tips">
      <div class="tip-badge" style="background:${COLORS.cyan};color:${COLORS.purple}">
        ${esc(d.tipLabel || "TIP")}
      </div>
      <h1 class="title" style="color:${text}">${multiline(d.title)}</h1>
      <div class="accent-line" style="background:${COLORS.cyan}"></div>
      <p class="body" style="color:${text}">${multiline(d.body)}</p>
    </div>
    <div class="footer">${logoBlock(d)}</div>
  `;
}

const CATEGORIES: Record<string, (d: DisenoPublicacion) => string> = {
  "dato-curioso": datoCurioso,
  promocion: promocion,
  servicios: servicios,
  tips: tips,
};

// --- CSS compartido --------------------------------------------------------

function styles(): string {
  return `
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${CANVAS.width}px; height:${CANVAS.height}px; }
  .canvas {
    width:${CANVAS.width}px; height:${CANVAS.height}px;
    position:relative; overflow:hidden;
    display:flex; flex-direction:column;
    padding:110px 90px 70px;
    font-family:${FONT_BODY};
  }
  .content {
    flex:1; display:flex; flex-direction:column;
    justify-content:center; align-items:center; text-align:center;
    gap:34px;
  }
  .title {
    font-family:${FONT_TITLE};
    font-weight:400;
    line-height:1.02;
    letter-spacing:1px;
    text-transform:uppercase;
    font-size:120px;
  }
  .body {
    font-family:${FONT_BODY};
    font-weight:800;
    font-size:46px;
    line-height:1.4;
    max-width:880px;
  }
  .accent-line { width:140px; height:10px; border-radius:6px; }
  .footer {
    display:flex; justify-content:center; align-items:flex-end;
    padding-top:30px;
  }
  .logo { height:auto; display:block; }
  .tag {
    font-family:${FONT_BODY}; font-weight:900;
    font-size:30px; letter-spacing:3px;
    padding:14px 30px; border-radius:999px; text-transform:uppercase;
  }

  /* Dato curioso */
  .dato .title { font-size:130px; }

  /* Promoción */
  .promo .promo-title { font-size:96px; }
  .promo-product { font-family:${FONT_BODY}; font-weight:900; font-size:54px; }
  .price-wrap { display:flex; align-items:center; gap:28px; }
  .price {
    font-family:${FONT_TITLE}; font-size:130px; line-height:1;
    padding:18px 44px; border-radius:24px;
  }
  .old-price { font-family:${FONT_BODY}; font-weight:800; font-size:60px; text-decoration:line-through; opacity:.6; }

  /* Servicios */
  .servicios .title { font-size:92px; }
  .service-list { list-style:none; display:flex; flex-direction:column; gap:30px; width:100%; max-width:840px; }
  .service-item {
    display:flex; align-items:center; gap:26px; text-align:left;
    font-family:${FONT_BODY}; font-weight:800; font-size:48px; line-height:1.2;
  }
  .bullet { width:26px; height:26px; border-radius:8px; flex:0 0 auto; transform:rotate(45deg); }

  /* Tips */
  .tip-badge {
    font-family:${FONT_TITLE}; font-size:44px; letter-spacing:2px;
    padding:16px 40px; border-radius:18px; text-transform:uppercase;
  }
  .tips .title { font-size:104px; }
  `;
}

// --- Render principal ------------------------------------------------------

export function renderDesign(design: DisenoPublicacion): string {
  const renderer = CATEGORIES[design.category];
  if (!renderer) {
    throw new Error(
      `Categoría desconocida: "${design.category}". Usa una de: ${Object.keys(CATEGORIES).join(", ")}`,
    );
  }
  const bg = resolveBackground(design.background);
  const inner = renderer(design);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  ${FONTS_LINK}
  <style>${styles()}</style>
</head>
<body>
  <div class="canvas" style="background:${bg}">
    ${inner}
  </div>
</body>
</html>`;
}

export const CATEGORY_NAMES = Object.keys(CATEGORIES) as DisenoPublicacion["category"][];
