import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const clienteSchema = z.object({
  nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  telefono: z.string().min(10, "Teléfono inválido").max(15),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
});

export const dispositivoSchema = z.object({
  cliente: z.number({ required_error: "Selecciona un cliente" }),
  tipo: z.enum(["celular", "tablet", "laptop", "computadora", "otro"]),
  marca: z.string().min(1, "Marca requerida"),
  modelo: z.string().min(1, "Modelo requerido"),
});

export const ordenSchema = z.object({
  dispositivo: z.number({ required_error: "Selecciona un dispositivo" }),
  problema_reportado: z.string().min(10, "Describe el problema (mínimo 10 caracteres)"),
});

export const cambiarEstadoSchema = z.object({
  estado: z.enum([
    "recibido",
    "diagnostico",
    "esperando_refaccion",
    "en_reparacion",
    "listo",
    "entregado",
  ]),
});

export const asignarTecnicoSchema = z.object({
  tecnico_id: z.number({ required_error: "Selecciona un técnico" }),
});

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

export const usuarioSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  email: z.string().email("Correo inválido"),
  rol: z.enum(["admin", "tecnico", "recepcion"]),
  password: z.string().min(8, "Mínimo 8 caracteres").optional().or(z.literal("")),
});

export const cambiarPasswordSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    password_confirm: z.string(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: "Las contraseñas no coinciden",
    path: ["password_confirm"],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type ClienteFormData = z.infer<typeof clienteSchema>;
export type DispositivoFormData = z.infer<typeof dispositivoSchema>;
export type OrdenFormData = z.infer<typeof ordenSchema>;
export type RefaccionFormData = z.infer<typeof refaccionSchema>;
export type AjusteStockFormData = z.infer<typeof ajusteStockSchema>;
export type UsuarioFormData = z.infer<typeof usuarioSchema>;
export type CambiarPasswordFormData = z.infer<typeof cambiarPasswordSchema>;
