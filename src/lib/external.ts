import type { MouseEvent } from "react";
import { isTauri } from "@/lib/helpers";

// Abre una URL en el navegador del SO. En Tauri un <a target="_blank"> no abre
// el navegador del sistema, así que usamos el plugin opener; en web, window.open.
export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// Handler para <a>: en Tauri intercepta el clic y abre con el plugin; en web deja
// el comportamiento nativo del enlace (no hace nada).
export function handleExternalClick(e: MouseEvent<HTMLAnchorElement>): void {
  if (isTauri()) {
    e.preventDefault();
    void openExternalUrl(e.currentTarget.href);
  }
}
