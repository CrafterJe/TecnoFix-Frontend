import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { EstadoOrden, TipoDispositivo, UserRole, AuditAction } from "@/types";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function formatDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, "d 'de' MMMM 'de' yyyy, h:mm a", { locale: es });
  } catch {
    return dateString;
  }
}

export function formatDateShort(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, "dd/MM/yyyy", { locale: es });
  } catch {
    return dateString;
  }
}

export function formatCurrency(value: string | number | null): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(num);
}

/**
 * Formatea una expresión de fórmula de cotización para mostrar al usuario.
 * - "precio*2+400" → "precio × 2 + 400"
 * - "Personalizado" / "Sin fórmula" → tal cual
 * - vacío/null → "—"
 */
export function formatearFormula(expresion: string | null | undefined): string {
  if (!expresion) return "—";
  if (expresion === "Personalizado" || expresion === "Sin fórmula") {
    return expresion;
  }
  return expresion.replace(/\*/g, " × ").replace(/\+/g, " + ");
}

/**
 * Convierte un texto a slug URL-friendly:
 * - lowercase
 * - sin acentos ni diacríticos
 * - espacios y separadores → guiones
 * - sin caracteres especiales
 *
 * "Celulares/Tablets" → "celulares-tablets"
 * "Cámara Frontal"    → "camara-frontal"
 * "Android 14"        → "android-14"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita diacríticos
    .replace(/[/\\]/g, "-") // separadores → guion
    .replace(/[^\w\s-]/g, "") // quita caracteres no alfanuméricos
    .trim()
    .replace(/\s+/g, "-") // espacios → guion
    .replace(/-+/g, "-") // colapsa guiones repetidos
    .replace(/^-+|-+$/g, ""); // recorta guiones extremos
}

export const ESTADO_LABELS: Record<EstadoOrden, string> = {
  recibido: "Recibido",
  diagnostico: "Diagnóstico",
  esperando_refaccion: "Esperando refacción",
  en_reparacion: "En reparación",
  listo: "Listo",
  entregado: "Entregado",
};

export const ESTADO_COLORS: Record<EstadoOrden, string> = {
  recibido: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  diagnostico: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  esperando_refaccion: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  en_reparacion: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  listo: "bg-green-500/20 text-green-400 border-green-500/30",
  entregado: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export const TIPO_DISPOSITIVO_LABELS: Record<TipoDispositivo, string> = {
  celular: "Celular",
  tablet: "Tablet",
  laptop: "Laptop",
  computadora: "Computadora",
  otro: "Otro",
};

export const ROL_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  tecnico: "Técnico",
  recepcion: "Recepción",
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Creación",
  UPDATE: "Actualización",
  DELETE: "Eliminación",
  ASSIGN: "Asignación",
  STATUS_CHANGE: "Cambio de estado",
  LOGIN: "Inicio de sesión",
};

export const AUDIT_ACTION_COLORS: Record<AuditAction, string> = {
  CREATE: "bg-green-500/20 text-green-400",
  UPDATE: "bg-blue-500/20 text-blue-400",
  DELETE: "bg-red-500/20 text-red-400",
  ASSIGN: "bg-purple-500/20 text-purple-400",
  STATUS_CHANGE: "bg-yellow-500/20 text-yellow-400",
  LOGIN: "bg-slate-500/20 text-slate-400",
};
