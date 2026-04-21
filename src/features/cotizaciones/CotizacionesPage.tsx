import { FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const MOCK_COTIZACIONES = [
  { id: 1, numero: "COT-001", cliente: "Juan Pérez", dispositivo: "iPhone 13 Pro", total: "$1,200.00", estado: "pendiente", fecha: "20/04/2026" },
  { id: 2, numero: "COT-002", cliente: "María García", dispositivo: "MacBook Air M1", total: "$3,500.00", estado: "aprobada", fecha: "19/04/2026" },
  { id: 3, numero: "COT-003", cliente: "Carlos López", dispositivo: "Samsung Galaxy S22", total: "$850.00", estado: "rechazada", fecha: "18/04/2026" },
];

const ESTADO_COLORS: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  aprobada: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rechazada: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export function CotizacionesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Cotizaciones"
        description="Gestiona las cotizaciones de reparación"
        actions={
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Nueva cotización
          </Button>
        }
      />

      <div className="space-y-3">
        {MOCK_COTIZACIONES.map((cot) => (
          <Card key={cot.id} className="cursor-not-allowed opacity-75">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{cot.numero} — {cot.cliente}</p>
                  <p className="text-xs text-muted-foreground">{cot.dispositivo} · {cot.fecha}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-sm">{cot.total}</span>
                <Badge className={ESTADO_COLORS[cot.estado]}>
                  {ESTADO_LABELS[cot.estado]}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Módulo en desarrollo — los datos mostrados son de ejemplo
      </p>
    </div>
  );
}
