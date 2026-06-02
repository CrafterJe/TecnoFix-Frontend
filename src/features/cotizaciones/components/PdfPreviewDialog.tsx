import { useEffect, useState } from "react";
import { Download, X, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isTauri } from "@/lib/helpers";

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fileName: string; // ej. "COT-20260515-001-cliente.pdf"
  blob: Blob | null;
}

export function PdfPreviewDialog({
  open,
  onOpenChange,
  title,
  fileName,
  blob,
}: PdfPreviewDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Crear/revocar object URL para mostrar en el iframe
  useEffect(() => {
    if (!open || !blob) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [open, blob]);

  async function handleDownload() {
    if (!blob) return;
    setDownloading(true);
    try {
      if (isTauri()) {
        await downloadInTauri(blob, fileName);
      } else {
        downloadInBrowser(blob, fileName);
      }
    } catch (e) {
      console.error("[pdf] download failed:", e);
      toast.error("No se pudo guardar el PDF");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3 border-b flex flex-row items-center justify-between space-y-0 shrink-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Visor — min-h-0 es clave para que el iframe respete el alto del flex parent */}
        <div className="flex-1 min-h-0 bg-neutral-800">
          {url ? (
            <iframe
              // #view=FitH = ajustar al ancho de página (mejor lectura)
              // #toolbar=1 = mostrar barra del visor (zoom, descargar nativo)
              src={`${url}#view=FitH&toolbar=1&navpanes=0`}
              title={title}
              className="w-full h-full border-0 block"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <DialogFooter className="p-3 border-t gap-2 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          <Button onClick={handleDownload} disabled={downloading || !blob}>
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isTauri() ? (
              <Download className="h-4 w-4 mr-2" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            {isTauri() ? "Descargar..." : "Descargar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Implementaciones de descarga ───────────────────────────────────

async function downloadInTauri(blob: Blob, fileName: string) {
  // Dynamic imports — el bundle web no carga los plugins de Tauri en navegador.
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  const { downloadDir } = await import("@tauri-apps/api/path");
  const { openPath } = await import("@tauri-apps/plugin-opener");

  // Resolver default folder (Downloads) y construir path sugerido.
  let defaultPath = fileName;
  try {
    const dir = await downloadDir();
    defaultPath = `${dir}/${fileName}`;
  } catch {
    // Si falla, deja solo el filename.
  }

  const filePath = await save({
    title: "Guardar PDF",
    defaultPath,
    filters: [
      { name: "PDF", extensions: ["pdf"] },
    ],
  });

  if (!filePath) {
    // Usuario canceló — no es un error
    return;
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  await writeFile(filePath, bytes);

  toast.success("PDF guardado", {
    description: filePath,
    action: {
      label: "Abrir",
      onClick: () => {
        openPath(filePath).catch((e) => {
          console.error("[pdf] no se pudo abrir:", e);
          toast.error("No se pudo abrir el archivo");
        });
      },
    },
    duration: 8000,
  });
}

function downloadInBrowser(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
