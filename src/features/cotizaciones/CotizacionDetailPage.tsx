import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { cotizacionesApi } from "@/api/cotizaciones";
import { formatCurrency, formatDate, formatearFormula } from "@/lib/helpers";
import { CotizacionSidebar } from "./components/CotizacionSidebar";
import { ItemWizard } from "./components/ItemWizard";
import { EstadoBanner } from "./components/EstadoBanner";
import type { EstadoCotizacion } from "@/types";

const ESTADO_LABELS: Record<EstadoCotizacion, string> = {
  borrador: "Borrador",
  finalizada: "Finalizada",
  autorizada: "Autorizada",
  cancelada: "Cancelada",
};

const ESTADO_COLORS: Record<EstadoCotizacion, string> = {
  borrador: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  finalizada: "bg-green-500/20 text-green-400 border-green-500/30",
  autorizada: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  cancelada: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function CotizacionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cotizacionId = Number(id);
  const idIsValid = Number.isInteger(cotizacionId) && cotizacionId > 0;

  const queryKey = ["cotizacion", cotizacionId];

  const { data: cotizacion, isLoading } = useQuery({
    queryKey,
    queryFn: () => cotizacionesApi.get(cotizacionId),
    enabled: idIsValid,
    refetchOnWindowFocus: false,
  });

  if (!idIsValid) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">ID de cotización inválido</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => navigate("/cotizaciones/lista")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Ver todas las cotizaciones
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cotizacion) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Cotización no encontrada</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => navigate("/cotizaciones/lista")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Ver todas las cotizaciones
        </Button>
      </div>
    );
  }

  const isBorrador = cotizacion.estado === "borrador";

  return (
    <div className="flex flex-col lg:h-full">
      <PageHeader
        title={cotizacion.numero_cotizacion}
        description={`Cliente: ${cotizacion.nombre_cliente}`}
        backTo="/cotizaciones/lista"
        backLabel="Volver al listado"
        breadcrumbs={[
          { label: "Cotizaciones", href: "/cotizaciones" },
          { label: "Todas", href: "/cotizaciones/lista" },
          { label: cotizacion.numero_cotizacion },
        ]}
        actions={
          <Badge variant="outline" className={ESTADO_COLORS[cotizacion.estado]}>
            {ESTADO_LABELS[cotizacion.estado]}
          </Badge>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6 lg:flex-1 lg:min-h-0">
        {/* Left: scrolleable internally en lg, flow natural en mobile */}
        <div className="flex-1 min-w-0 lg:overflow-y-auto lg:pr-2 space-y-4">
          {!isBorrador && (
            <EstadoBanner
              estado={cotizacion.estado}
              numero={cotizacion.numero_cotizacion}
              ordenVinculada={cotizacion.orden_vinculada}
              cancelacionRazon={cotizacion.cancelacion_razon}
              cancelacionNotas={cotizacion.cancelacion_notas}
            />
          )}
          {isBorrador ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Agregar item</CardTitle>
              </CardHeader>
              <CardContent>
                <ItemWizard
                  cotizacionId={cotizacionId}
                  cotizacionQueryKey={queryKey}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Items cotizados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {cotizacion.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Esta cotización no tiene items
                  </p>
                ) : (
                  cotizacion.items.map((item, i) => (
                    <div key={item.id}>
                      {i > 0 && <Separator />}
                      <div className="py-4 flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.tipo_reparacion_nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.subcategoria_nombre} · {item.es_manual ? "Manual" : (item.fuente_api?.nombre ?? "—")}
                          </p>
                          {item.producto_titulo && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.producto_titulo}
                            </p>
                          )}
                          {item.formula_snapshot && !item.es_personalizado && (
                            <p className="text-[11px] font-mono text-muted-foreground">
                              Fórmula: {formatearFormula(item.formula_snapshot)}
                            </p>
                          )}
                          {item.link_referencia && (
                            <a
                              href={item.link_referencia}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-primary hover:underline truncate block"
                            >
                              {item.link_referencia}
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-sm font-semibold tabular-nums">
                            {formatCurrency(item.subtotal)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(item.precio_final)} × {item.cantidad}
                          </span>
                          {!item.disponible && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-400 border-orange-500/30"
                            >
                              Sin stock
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Metadata card */}
          <Card>
            <CardContent className="py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Creada</span>
                <span>{formatDate(cotizacion.created_at)}</span>
              </div>
              {cotizacion.created_by_nombre && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Creada por</span>
                  <span>{cotizacion.created_by_nombre}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Actualizada</span>
                <span>{formatDate(cotizacion.updated_at)}</span>
              </div>
              {cotizacion.notas && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Notas</span>
                  <span className="text-right max-w-[60%]">{cotizacion.notas}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: full width en mobile, 320px sticky en lg */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <Card className="flex flex-col max-h-[60vh] lg:max-h-none lg:h-full">
            <CotizacionSidebar
              cotizacion={cotizacion}
              queryKey={queryKey}
              allowDelete
              onDeleted={() => navigate("/cotizaciones/lista")}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
