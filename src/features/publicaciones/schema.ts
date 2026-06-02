// schema.ts — Definición de los campos de formulario por categoría y las
// opciones de fondo. Puerto del SCHEMA/BACKGROUNDS del editor original.
import type { CategoriaPublicacion, FondoPublicacion } from "@/types";

export interface CampoDef {
  k: string; // clave en el objeto diseño
  label: string;
  type: "text" | "area";
  val: string; // valor por defecto
  half?: boolean; // se agrupa en fila de 2 columnas con el siguiente campo "half"
  placeholder?: string;
  money?: boolean; // input con "$" fijo como prefijo; se antepone solo si hay valor
}

export interface CategoriaDef {
  value: CategoriaPublicacion;
  label: string;
  campos: CampoDef[];
}

// Orden = orden en el selector de categoría.
export const CATEGORIAS: CategoriaDef[] = [
  {
    value: "dato-curioso",
    label: "Dato curioso",
    campos: [
      { k: "title", label: "Título", type: "text", val: "Dato Curioso" },
      { k: "body", label: "Texto", type: "area", val: "Escribe aquí el dato curioso…" },
    ],
  },
  {
    value: "promocion",
    label: "Promoción / Oferta",
    campos: [
      { k: "tag", label: "Etiqueta", type: "text", val: "Promoción del mes" },
      { k: "title", label: "Título", type: "text", val: "Cambio de pantalla" },
      { k: "product", label: "Subtítulo / producto", type: "text", val: "Para tu smartphone" },
      { k: "oldPrice", label: "Precio anterior (opcional)", type: "text", val: "1,200", half: true, money: true, placeholder: "1,200" },
      { k: "price", label: "Precio", type: "text", val: "899", half: true, money: true, placeholder: "899" },
      { k: "body", label: "Detalle (opcional)", type: "area", val: "Incluye instalación y garantía." },
    ],
  },
  {
    value: "servicios",
    label: "Servicios",
    campos: [
      { k: "tag", label: "Etiqueta", type: "text", val: "Nuestros servicios" },
      { k: "title", label: "Título", type: "text", val: "¿Qué hacemos por ti?" },
      {
        k: "items",
        label: "Servicios (uno por línea)",
        type: "area",
        val: "Reparación de celulares y tablets\nMantenimiento de computadoras\nRecuperación de información\nVenta de accesorios",
      },
    ],
  },
  {
    value: "tips",
    label: "Tip / Consejo",
    campos: [
      { k: "tipLabel", label: "Etiqueta", type: "text", val: "Tip TecnoFix" },
      { k: "title", label: "Título", type: "text", val: "Cuida tu batería" },
      { k: "body", label: "Texto", type: "area", val: "Evita cargar tu celular al 100% toda la noche…" },
    ],
  },
];

export const CATEGORIAS_MAP: Record<CategoriaPublicacion, CategoriaDef> = Object.fromEntries(
  CATEGORIAS.map((c) => [c.value, c]),
) as Record<CategoriaPublicacion, CategoriaDef>;

export interface FondoDef {
  name: string;
  value: FondoPublicacion;
  sw: string; // CSS para el swatch del chip
  disabled?: boolean; // se muestra pero no es seleccionable
}

export const BACKGROUNDS: FondoDef[] = [
  {
    name: "Degradado morado",
    value: { type: "gradient", from: "purple", to: "#1B1A40", angle: 160 },
    sw: "linear-gradient(160deg,#2D2B6E,#1B1A40)",
  },
  { name: "Morado", value: "purple", sw: "#2D2B6E" },
  {
    name: "Degradado azul",
    value: { type: "gradient", from: "#3A37A0", to: "purple", angle: 160 },
    sw: "linear-gradient(160deg,#3A37A0,#2D2B6E)",
  },
  // Deshabilitado temporalmente: falta el logo adecuado para fondo cian.
  { name: "Cian", value: "cyan", sw: "#02C5CE", disabled: true },
  { name: "Crema", value: "cream", sw: "#F4F4FA" },
  { name: "Blanco", value: "white", sw: "#ffffff" },
];

// Compara dos definiciones de fondo (para marcar el chip activo).
export function sameFondo(a: FondoPublicacion, b: FondoPublicacion): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
