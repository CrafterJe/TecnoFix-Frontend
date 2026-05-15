/**
 * Extrae un mensaje legible de un error de Axios contra DRF.
 * Maneja:
 *  - { detail: "mensaje" }                            → "mensaje"
 *  - { campo: ["error1", "error2"], otro: ["..."] }   → "campo: error1 error2 · otro: ..."
 *  - { non_field_errors: ["..."] }                    → "..."
 *  - string plano                                     → tal cual
 *  - cualquier otra cosa                              → fallback
 */
export function extractApiError(error: unknown, fallback = "Error al guardar"): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (error as any)?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.detail) return String(data.detail);
  if (data.non_field_errors) {
    const msgs = data.non_field_errors;
    return Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
  }
  if (typeof data === "object") {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      const msg = Array.isArray(value) ? value.join(" ") : String(value);
      parts.push(`${key}: ${msg}`);
    }
    if (parts.length > 0) return parts.join(" · ");
  }
  return fallback;
}
