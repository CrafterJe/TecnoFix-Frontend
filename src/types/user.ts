export type UserRole = "admin" | "tecnico" | "recepcion";

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
  activo: boolean;
}

export interface UserPayload {
  nombre: string;
  email: string;
  rol: UserRole;
  password?: string;
}
