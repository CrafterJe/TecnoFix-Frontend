// brand.ts — Identidad visual de TecnoFix y utilidades compartidas.
//
// Puerto a TypeScript de brand.js (proyecto original Node). Diferencia clave:
// los SVG ya no se leen con readFileSync (API de Node); se importan como texto
// crudo con Vite (?raw) y se incrustan como data URI en el navegador.
import type { FondoPublicacion } from "@/types";

import tecnofixSvg from "../assets/tecnofix.svg?raw";
import tecnofixBlancoSvg from "../assets/tecnofix-blanco.svg?raw";
import iconoTecnofixSvg from "../assets/icono-tecnofix.svg?raw";
import iconoTecnofixBlancoSvg from "../assets/icono-tecnofix-blanco.svg?raw";

// Paleta oficial (tomada de los SVG del logo).
export const COLORS: Record<string, string> = {
  purple: "#2D2B6E", // azul/morado principal
  cyan: "#02C5CE", // cian de acento
  white: "#FFFFFF",
  cream: "#F4F4FA", // fondo claro suave
  ink: "#1B1A40", // texto oscuro sobre fondos claros
};

// Tipografías similares a la plantilla de Canva (Google Fonts).
// Títulos: Anton (condensada, muy bold). Texto: Nunito (redondeada).
export const FONTS_LINK = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700&display=swap" rel="stylesheet">
`;

export const FONT_TITLE = "'Anton', sans-serif";
export const FONT_BODY = "'Nunito', sans-serif";

// Codifica una cadena UTF-8 a base64 (equivalente a Buffer.from(s).toString("base64")).
function toBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

// Convierte un SVG (texto) en data URI para incrustarlo sin problemas de rutas.
function svgDataUri(svg: string): string {
  return "data:image/svg+xml;base64," + toBase64Utf8(svg);
}

type LogoVariant = "full" | "icon";

// Logos disponibles (versión a color para fondos claros, blanca para oscuros).
export const LOGOS: Record<LogoVariant, { normal: string; white: string }> = {
  full: {
    normal: svgDataUri(tecnofixSvg),
    white: svgDataUri(tecnofixBlancoSvg),
  },
  icon: {
    normal: svgDataUri(iconoTecnofixSvg),
    white: svgDataUri(iconoTecnofixBlancoSvg),
  },
};

// Decide si un fondo es "oscuro" para elegir el logo blanco.
// Acepta hex (#RRGGBB), un nombre de COLORS, o un gradiente { from, to }.
export function isDarkBackground(bg: FondoPublicacion | undefined): boolean {
  // Para gradientes usamos el color "from" como referencia.
  let ref: string | undefined;
  if (bg && typeof bg === "object") ref = bg.from;
  else ref = bg;

  const hex = (COLORS[ref ?? ""] || ref || "").replace("#", "");
  if (hex.length !== 6) return true; // por defecto asumimos oscuro (caso degradado morado)
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Luminancia relativa percibida. Umbral 0.5: el cian (~0.548) cae del lado
  // "claro" para que use el logo de color (el blanco se pierde sobre cian).
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

// Devuelve el data URI del logo correcto según el fondo.
export function logoFor(bg: FondoPublicacion | undefined, variant: LogoVariant = "full"): string {
  const dark = isDarkBackground(bg);
  return LOGOS[variant][dark ? "white" : "normal"];
}

// Lienzo base de las publicaciones (FB / IG retrato).
export const CANVAS = { width: 1080, height: 1350 };
