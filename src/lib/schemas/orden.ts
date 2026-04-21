import { z } from "zod";

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

export type OrdenFormData = z.infer<typeof ordenSchema>;
