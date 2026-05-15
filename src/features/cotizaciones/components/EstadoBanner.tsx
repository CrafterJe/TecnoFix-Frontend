import { CheckCircle2, XCircle, Lock } from "lucide-react";
import type { EstadoCotizacion } from "@/types";

const CONFIG: Record<
  Exclude<EstadoCotizacion, "borrador">,
  { icon: typeof CheckCircle2; bg: string; text: string; label: string }
> = {
  finalizada: {
    icon: CheckCircle2,
    bg: "bg-green-500/10 border-green-500/30",
    text: "text-green-400",
    label: "finalizada",
  },
  cancelada: {
    icon: XCircle,
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-400",
    label: "cancelada",
  },
};

interface Props {
  estado: EstadoCotizacion;
  numero?: string;
}

export function EstadoBanner({ estado, numero }: Props) {
  if (estado === "borrador") return null;
  const config = CONFIG[estado];
  const Icon = config.icon;
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${config.bg}`}
      role="status"
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${config.text}`} />
      <div className="flex-1">
        <p className={`text-sm font-medium ${config.text}`}>
          Esta cotización {numero ? `(${numero}) ` : ""}fue {config.label}.
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
          <Lock className="h-3 w-3" />
          Solo lectura — no se pueden agregar ni quitar items.
        </p>
      </div>
    </div>
  );
}
