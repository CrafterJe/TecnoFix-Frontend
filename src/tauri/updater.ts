import { isTauri } from "@/lib/helpers";

interface UpdateDialogState {
  open: boolean;
  version: string;
  body: string | null;
  onUpdate: () => Promise<void>;
}

type UpdateDialogCallback = (state: UpdateDialogState) => void;

let dialogCallback: UpdateDialogCallback | null = null;

export function registerUpdateDialogCallback(cb: UpdateDialogCallback) {
  dialogCallback = cb;
}

export async function initUpdater() {
  if (!isTauri()) return;

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const { sendNotification } = await import("@tauri-apps/plugin-notification");

    const update = await check();
    if (!update?.available) return;

    const version = update.version;

    await sendNotification({
      title: "TecnoFix — Actualización disponible",
      body: `La versión ${version} está disponible. Haz clic para actualizar.`,
    });

    if (dialogCallback) {
      dialogCallback({
        open: true,
        version,
        body: update.body ?? null,
        onUpdate: async () => {
          await update.downloadAndInstall();
          // relaunch via Tauri core after install
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("plugin:process|relaunch");
        },
      });
    }
  } catch (err) {
    console.error("[updater]", err);
  }
}
