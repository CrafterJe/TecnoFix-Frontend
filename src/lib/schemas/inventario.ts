import { z } from "zod";

export const refaccionSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  descripcion: z.string().optional().default(""),
  categoria: z.string().min(1, "Categoría requerida"),
  stock: z.number().min(0, "Stock no puede ser negativo"),
  stock_minimo: z.number().min(0, "Stock mínimo no puede ser negativo"),
  precio_costo: z.string().regex(/^\d+(\.\d{1,2})?$/, "Precio inválido"),
  precio_venta: z.string().regex(/^\d+(\.\d{1,2})?$/, "Precio inválido"),
});

export const ajusteStockSchema = z.object({
  cantidad: z.number().min(1, "Cantidad mínima es 1"),
  tipo: z.enum(["entrada", "salida"]),
});

export type RefaccionFormData = z.infer<typeof refaccionSchema>;
export type AjusteStockFormData = z.infer<typeof ajusteStockSchema>;
