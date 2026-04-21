import { cn } from "@/lib/utils";
import { ESTADO_LABELS, ESTADO_COLORS } from "@/lib/helpers";
import type { EstadoOrden } from "@/types";

interface Props {
  estado: EstadoOrden;
  className?: string;
}

export function StatusBadge({ estado, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        ESTADO_COLORS[estado],
        className
      )}
    >
      {ESTADO_LABELS[estado]}
    </span>
  );
}
