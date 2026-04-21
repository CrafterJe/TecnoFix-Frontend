import { z } from "zod";

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

export type ClienteFormData = z.infer<typeof clienteSchema>;
export type DispositivoFormData = z.infer<typeof dispositivoSchema>;
