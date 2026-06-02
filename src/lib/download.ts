import { toast } from "sonner";
import { isTauri } from "@/lib/helpers";

export interface SaveBlobOptions {
  // Título del diálogo nativo de Tauri y nombre del filtro de archivos.
  tauriTitle?: string;
  filterName?: string; // ej. "PNG"
  extensions?: string[]; // ej. ["png"]
}

// Guarda un blob como archivo. En Tauri abre el diálogo nativo "Guardar como"
// y ofrece abrir el archivo; en web dispara una descarga con <a download>.
export async function saveBlob(
  blob: Blob,
  fileName: string,
  options: SaveBlobOptions = {},
): Promise<void> {
  if (isTauri()) {
    await saveBlobInTauri(blob, fileName, options);
  } else {
    saveBlobInBrowser(blob, fileName);
  }
}

async function saveBlobInTauri(
  blob: Blob,
  fileName: string,
  { tauriTitle = "Guardar archivo", filterName = "Archivo", extensions = [] }: SaveBlobOptions,
) {
  // Dynamic imports — el bundle web no carga los plugins de Tauri en navegador.
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  const { downloadDir } = await import("@tauri-apps/api/path");
  const { revealItemInDir } = await import("@tauri-apps/plugin-opener");

  let defaultPath = fileName;
  try {
    const dir = await downloadDir();
    defaultPath = `${dir}/${fileName}`;
  } catch {
    // Si falla, deja solo el filename.
  }

  const filePath = await save({
    title: tauriTitle,
    defaultPath,
    filters: extensions.length ? [{ name: filterName, extensions }] : undefined,
  });

  if (!filePath) {
    // Usuario canceló — no es un error.
    return;
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  await writeFile(filePath, bytes);

  toast.success("Archivo guardado", {
    description: filePath,
    action: {
      label: "Ver en carpeta",
      onClick: () => {
        revealItemInDir(filePath).catch((e) => {
          console.error("[download] no se pudo abrir la carpeta:", e);
          toast.error("No se pudo abrir la carpeta del archivo");
        });
      },
    },
    duration: 8000,
  });
}

function saveBlobInBrowser(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
