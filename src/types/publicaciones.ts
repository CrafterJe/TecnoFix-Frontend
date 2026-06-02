// Tipos del módulo "Crear publicación" (mini-Canva de marca TecnoFix).
// El objeto Diseño es el contrato que el front envía al backend para exportar el PNG.

export type CategoriaPublicacion =
  | "dato-curioso"
  | "promocion"
  | "servicios"
  | "tips";

// Definición de un fondo: nombre de color de la paleta, hex, o gradiente.
export type FondoGradiente = {
  type: "gradient";
  from: string;
  to: string;
  angle?: number;
};

export type FondoPublicacion = string | FondoGradiente;

// Objeto "design" que viaja al backend. Los campos opcionales dependen de la
// categoría (ver schema.ts para qué campos aplica cada una).
export interface DisenoPublicacion {
  id: string; // nombre de archivo sugerido (sin extensión)
  category: CategoriaPublicacion;
  background: FondoPublicacion;
  title?: string;
  body?: string;
  tag?: string;
  product?: string;
  oldPrice?: string;
  price?: string;
  items?: string[];
  tipLabel?: string;
}
