import { CheckCircle2, XCircle, Lock, ShieldCheck, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { EstadoCotizacion, RazonCancelacionCotizacion, CotizacionOrdenVinculada } from "@/types";

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
  autorizada: {
    icon: ShieldCheck,
    bg: "bg-cyan-500/10 border-cyan-500/30",
    text: "text-cyan-400",
    label: "autorizada",
  },
  cancelada: {
    icon: XCircle,
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-400",
    label: "cancelada",
  },
};

const RAZON_LABELS: Record<RazonCancelacionCotizacion, string> = {
  cliente_cambio_opinion: "Cliente cambió de opinión",
  cliente_sin_presupuesto: "Cliente sin presupuesto",
  no_reparable: "No pudimos reparar",
  otro: "Otro",
};

interface Props {
  estado: EstadoCotizacion;
  numero?: string;
  ordenVinculada?: CotizacionOrdenVinculada | null;
  cancelacionRazon?: RazonCancelacionCotizacion | null;
  cancelacionNotas?: string | null;
}

export function EstadoBanner({
  estado,
  numero,
  ordenVinculada,
  cancelacionRazon,
  cancelacionNotas,
}: Props) {
  if (estado === "borrador") return null;
  const config = CONFIG[estado];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${config.bg}`}
      role="status"
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${config.text}`} />
      <div className="flex-1 space-y-1">
        <p className={`text-sm font-medium ${config.text}`}>
          Esta cotización {numero ? `(${numero}) ` : ""}fue {config.label}.
        </p>

        {estado === "autorizada" && ordenVinculada && (
          <Link
            to={`/ordenes/${ordenVinculada.id}`}
            className="text-xs text-cyan-300 hover:text-cyan-200 hover:underline inline-flex items-center gap-1"
          >
            Ver orden vinculada: {ordenVinculada.numero_orden}
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}

        {estado === "cancelada" && cancelacionRazon && (
          <p className="text-xs text-muted-foreground">
            Razón:{" "}
            <span className="text-foreground">{RAZON_LABELS[cancelacionRazon]}</span>
            {cancelacionNotas ? ` — ${cancelacionNotas}` : null}
          </p>
        )}

        {(estado === "finalizada" || estado === "autorizada") && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            Solo lectura — no se pueden agregar ni quitar items.
          </p>
        )}
      </div>
    </div>
  );
}
