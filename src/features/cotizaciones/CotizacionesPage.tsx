import { useNavigate } from "react-router-dom";
import { FileText, Plus, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";

export function CotizacionesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === "admin";

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Cotizaciones</h1>
        <p className="text-muted-foreground">¿Qué deseas hacer?</p>
      </div>

      <div
        className={`grid grid-cols-1 gap-6 w-full ${
          isAdmin ? "sm:grid-cols-3 max-w-3xl" : "sm:grid-cols-2 max-w-xl"
        }`}
      >
        <Card
          className="cursor-pointer hover:border-primary/60 hover:bg-accent/30 transition-all duration-200 group"
          onClick={() => navigate("/cotizaciones/lista")}
        >
          <CardContent className="flex flex-col items-center gap-4 py-12 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold">Ver cotizaciones</p>
              <p className="text-sm text-muted-foreground">
                Consulta el historial de cotizaciones
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-[#02C5CE]/60 hover:bg-accent/30 transition-all duration-200 group"
          onClick={() => navigate("/cotizaciones/nueva")}
        >
          <CardContent className="flex flex-col items-center gap-4 py-12 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#02C5CE]/10 group-hover:bg-[#02C5CE]/20 transition-colors">
              <Plus className="h-8 w-8 text-[#02C5CE]" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold">Nueva cotización</p>
              <p className="text-sm text-muted-foreground">
                Crea una cotización paso a paso
              </p>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card
            className="cursor-pointer hover:border-muted-foreground/40 hover:bg-accent/30 transition-all duration-200 group"
            onClick={() => navigate("/cotizaciones/configuracion")}
          >
            <CardContent className="flex flex-col items-center gap-4 py-12 px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted group-hover:bg-muted/70 transition-colors">
                <Settings className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold">Configuración</p>
                <p className="text-sm text-muted-foreground">
                  Categorías, tipos y fórmulas
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
