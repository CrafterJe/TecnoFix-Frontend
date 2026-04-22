import { z } from "zod";

export const usuarioSchema = z
  .object({
    nombre: z.string().min(2, "Nombre requerido"),
    email: z.string().email("Correo inválido"),
    rol: z.enum(["admin", "tecnico", "recepcion"]),
    password: z.string().min(8, "Mínimo 8 caracteres").optional().or(z.literal("")),
    password_confirm: z.string().optional().or(z.literal("")),
  })
  .refine(
    (d) => !d.password || d.password === d.password_confirm,
    { message: "Las contraseñas no coinciden", path: ["password_confirm"] }
  );

export const cambiarPasswordSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    password_confirm: z.string(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: "Las contraseñas no coinciden",
    path: ["password_confirm"],
  });

export const cambiarPasswordPropioSchema = z
  .object({
    password_actual: z.string().min(1, "Ingresa tu contraseña actual"),
    password_nuevo: z.string().min(8, "Mínimo 8 caracteres"),
    password_nuevo_confirm: z.string(),
  })
  .refine((d) => d.password_nuevo === d.password_nuevo_confirm, {
    message: "Las contraseñas no coinciden",
    path: ["password_nuevo_confirm"],
  });

export type UsuarioFormData = z.infer<typeof usuarioSchema>;
export type CambiarPasswordFormData = z.infer<typeof cambiarPasswordSchema>;
export type CambiarPasswordPropioFormData = z.infer<typeof cambiarPasswordPropioSchema>;
