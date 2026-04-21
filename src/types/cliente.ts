export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  created_at: string;
}

export interface ClientePayload {
  nombre: string;
  telefono: string;
  email?: string;
}

export type TipoDispositivo =
  | "celular"
  | "tablet"
  | "laptop"
  | "computadora"
  | "otro";

export interface Dispositivo {
  id: number;
  cliente: { id: number; nombre: string };
  tipo: TipoDispositivo;
  marca: string;
  modelo: string;
}

export interface DispositivoPayload {
  cliente: number;
  tipo: TipoDispositivo;
  marca: string;
  modelo: string;
}
