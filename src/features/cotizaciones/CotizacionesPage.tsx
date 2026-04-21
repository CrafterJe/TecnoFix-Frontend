import { Construction } from "lucide-react";

export function CotizacionesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
      <Construction className="h-16 w-16" />
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold text-foreground">En construcción</h2>
        <p className="text-sm">El módulo de cotizaciones estará disponible próximamente.</p>
      </div>
    </div>
  );
}
