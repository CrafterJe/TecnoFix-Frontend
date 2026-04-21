import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { registerUpdateDialogCallback } from "./updater";

export function UpdaterDialog() {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState("");
  const [body, setBody] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [onUpdateFn, setOnUpdateFn] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    registerUpdateDialogCallback(({ open: o, version: v, body: b, onUpdate }) => {
      setOpen(o);
      setVersion(v);
      setBody(b);
      setOnUpdateFn(() => onUpdate);
    });
  }, []);

  const handleUpdate = async () => {
    if (!onUpdateFn) return;
    setInstalling(true);
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 90));
    }, 400);
    try {
      await onUpdateFn();
    } finally {
      clearInterval(interval);
      setProgress(100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Actualización disponible — v{version}
          </DialogTitle>
          <DialogDescription>
            Una nueva versión de TecnoFix está disponible. Se recomienda actualizar para obtener
            las últimas mejoras y correcciones de seguridad.
          </DialogDescription>
        </DialogHeader>

        {body && (
          <ScrollArea className="h-40 rounded-md border bg-muted/30 p-3">
            <pre className="text-xs whitespace-pre-wrap font-sans">{body}</pre>
          </ScrollArea>
        )}

        {installing && (
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">
              {progress < 100 ? "Descargando e instalando..." : "Reiniciando aplicación..."}
            </p>
            <Progress value={progress} />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={installing}
          >
            <X className="h-4 w-4 mr-2" />
            Más tarde
          </Button>
          <Button onClick={handleUpdate} disabled={installing}>
            <Download className="h-4 w-4 mr-2" />
            {installing ? "Actualizando..." : "Actualizar ahora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
