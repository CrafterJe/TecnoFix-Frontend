import { isTauri } from "@/lib/helpers";

interface UpdateDialogState {
  open: boolean;
  version: string;
  body: string | null;
  onUpdate: () => Promise<void>;
}

type UpdateDialogCallback = (state: UpdateDialogState) => void;

let dialogCallback: UpdateDialogCallback | null = null;
let pendingState: UpdateDialogState | null = null;

export function registerUpdateDialogCallback(cb: UpdateDialogCallback) {
  dialogCallback = cb;
  if (pendingState) {
    cb(pendingState);
    pendingState = null;
  }
}

function emitDialogState(state: UpdateDialogState) {
  if (dialogCallback) {
    dialogCallback(state);
  } else {
    pendingState = state;
  }
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

    emitDialogState({
      open: true,
      version,
      body: update.body ?? null,
      onUpdate: async () => {
        await update.downloadAndInstall();
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      },
    });
  } catch (err) {
    console.error("[updater]", err);
  }
}
