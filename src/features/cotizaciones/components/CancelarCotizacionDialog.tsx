import { useState } from "react";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RazonCancelacionCotizacion } from "@/types";

export interface CancelarCotizacionPayload {
  razon: RazonCancelacionCotizacion;
  notas: string | null;
}

interface CancelarCotizacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroCotizacion: string;
  onCancelado: (payload: CancelarCotizacionPayload) => void;
  isPending?: boolean;
}

const RAZONES: { value: RazonCancelacionCotizacion; label: string; desc: string }[] = [
  {
    value: "cliente_cambio_opinion",
    label: "Cliente cambió de opinión",
    desc: "El cliente decidió no continuar con el servicio.",
  },
  {
    value: "cliente_sin_presupuesto",
    label: "Cliente sin presupuesto",
    desc: "El cliente no puede cubrir el costo en este momento.",
  },
  {
    value: "no_reparable",
    label: "No pudimos reparar",
    desc: "Detectamos algo que impide reparar el dispositivo.",
  },
  { value: "otro", label: "Otro", desc: "Otra razón (especifica en las notas)." },
];

export function CancelarCotizacionDialog({
  open,
  onOpenChange,
  numeroCotizacion,
  onCancelado,
  isPending = false,
}: CancelarCotizacionDialogProps) {
  const [razon, setRazon] = useState<RazonCancelacionCotizacion | null>(null);
  const [notas, setNotas] = useState("");

  function reset() {
    setRazon(null);
    setNotas("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const requireNotas = razon === "otro";
  const valid =
    razon !== null && (!requireNotas || notas.trim().length >= 5);

  function handleSubmit() {
    if (!razon) return;
    onCancelado({
      razon,
      notas: notas.trim() ? notas.trim() : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-400" />
            Reportar cancelación
          </DialogTitle>
          <DialogDescription>
            Vas a marcar la cotización <span className="font-medium">{numeroCotizacion}</span> como cancelada.
            Esta acción queda registrada en auditoría.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Razón de la cancelación *</Label>
            <div className="space-y-2">
              {RAZONES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRazon(r.value)}
                  className={cn(
                    "w-full text-left border rounded-md p-2.5 transition-colors hover:bg-muted/60",
                    razon === r.value && "border-primary bg-primary/5",
                  )}
                >
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cancel-notas">
              Notas adicionales {requireNotas && "*"}
            </Label>
            <Textarea
              id="cancel-notas"
              placeholder={
                requireNotas
                  ? "Explica brevemente la razón (mínimo 5 caracteres)..."
                  : "Detalles opcionales..."
              }
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!valid || isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Confirmar cancelación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
