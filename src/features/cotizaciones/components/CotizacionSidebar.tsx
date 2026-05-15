import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trash2, FileDown, CheckCircle, XCircle, Loader2, Plus, FileText, List,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cotizacionesApi } from "@/api/cotizaciones";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency } from "@/lib/helpers";
import type { Cotizacion, EstadoCotizacion } from "@/types";

const ESTADO_LABELS: Record<EstadoCotizacion, string> = {
  borrador: "Borrador",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

const ESTADO_COLORS: Record<EstadoCotizacion, string> = {
  borrador: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  finalizada: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelada: "bg-red-500/20 text-red-400 border-red-500/30",
};

interface CotizacionSidebarProps {
  cotizacion: Cotizacion;
  queryKey: unknown[];
  allowDelete?: boolean;
  onDeleted?: () => void;
}

export function CotizacionSidebar({
  cotizacion,
  queryKey,
  allowDelete = false,
  onDeleted,
}: CotizacionSidebarProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isBorrador = cotizacion.estado === "borrador";
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === "admin";
  const [pdfLoading, setPdfLoading] = useState<"cliente" | "empresa" | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [postChangeModal, setPostChangeModal] = useState<EstadoCotizacion | null>(null);

  const removeItem = useMutation({
    mutationFn: (itemId: number) => cotizacionesApi.items.remove(cotizacion.id, itemId),
    onSuccess: () => {
      toast.success("Item eliminado");
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: unknown) => {
      const detail = (e as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      toast.error(detail || "No se pudo eliminar el item");
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: (estado: EstadoCotizacion) => cotizacionesApi.cambiarEstado(cotizacion.id, estado),
    onSuccess: (updated) => {
      const label = updated.estado === "finalizada" ? "finalizada" : "cancelada";
      toast.success(`Cotización ${label}`);
      qc.invalidateQueries({ queryKey });
      if (updated.estado !== "borrador") {
        setPostChangeModal(updated.estado);
      }
    },
    onError: () => toast.error("No se pudo cambiar el estado"),
  });

  const deleteCotizacion = useMutation({
    mutationFn: () => cotizacionesApi.delete(cotizacion.id),
    onSuccess: () => {
      toast.success("Cotización eliminada");
      qc.invalidateQueries({ queryKey: ["cotizaciones"] });
      setConfirmDel(false);
      onDeleted?.();
    },
    onError: () => {
      toast.error("No se pudo eliminar la cotización");
      setConfirmDel(false);
    },
  });

  async function downloadPdf(tipo: "cliente" | "empresa") {
    setPdfLoading(tipo);
    try {
      await cotizacionesApi.pdf(cotizacion.id, tipo);
    } catch {
      toast.error("No se pudo generar el PDF");
    } finally {
      setPdfLoading(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{cotizacion.numero_cotizacion}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{cotizacion.nombre_cliente}</p>
          </div>
          <Badge variant="outline" className={ESTADO_COLORS[cotizacion.estado]}>
            {ESTADO_LABELS[cotizacion.estado]}
          </Badge>
        </div>
      </div>

      {/* Items list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {cotizacion.items.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-8">
              Aún no hay items en esta cotización
            </p>
          ) : (
            cotizacion.items.map((item) => (
              <div key={item.id} className="group relative">
                <div className="flex flex-col gap-0.5 pr-5">
                  <p className="text-xs font-medium leading-tight">{item.tipo_reparacion_nombre}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.subcategoria_nombre} · {item.es_manual ? "Manual" : (item.fuente_api?.nombre ?? "—")}
                  </p>
                  {item.producto_titulo && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.producto_titulo}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">×{item.cantidad}</span>
                    <span className="text-xs font-semibold tabular-nums">
                      {formatCurrency(item.subtotal)}
                    </span>
                    {!item.disponible && (
                      <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">
                        Sin stock
                      </span>
                    )}
                  </div>
                </div>
                {isBorrador && (
                  <button
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive disabled:opacity-50"
                    onClick={() => removeItem.mutate(item.id)}
                    disabled={removeItem.isPending}
                    title="Eliminar item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <Separator className="mt-3" />
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Total + Actions */}
      <div className="p-4 border-t space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-sm">Total</span>
          <span className="font-bold text-base tabular-nums">{formatCurrency(cotizacion.total)}</span>
        </div>

        {isBorrador && (
          <div className="space-y-2">
            <Button
              className="w-full"
              size="sm"
              onClick={() => cambiarEstado.mutate("finalizada")}
              disabled={cambiarEstado.isPending || cotizacion.items.length === 0}
            >
              {cambiarEstado.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5 mr-2" />
              )}
              Finalizar cotización
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="sm"
              onClick={() => cambiarEstado.mutate("cancelada")}
              disabled={cambiarEstado.isPending}
            >
              <XCircle className="h-3.5 w-3.5 mr-2" />
              Cancelar cotización
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            size="sm"
            onClick={() => downloadPdf("cliente")}
            disabled={pdfLoading !== null || cotizacion.items.length === 0}
            title={cotizacion.items.length === 0 ? "Agrega items para generar PDF" : undefined}
          >
            {pdfLoading === "cliente" ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5 mr-2" />
            )}
            PDF Cliente
          </Button>
          <Button
            variant="outline"
            className="w-full"
            size="sm"
            onClick={() => downloadPdf("empresa")}
            disabled={pdfLoading !== null || cotizacion.items.length === 0}
            title={cotizacion.items.length === 0 ? "Agrega items para generar PDF" : undefined}
          >
            {pdfLoading === "empresa" ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5 mr-2" />
            )}
            PDF Empresa
          </Button>
        </div>

        {allowDelete && isAdmin && (
          <>
            <Separator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDel(true)}
              disabled={deleteCotizacion.isPending}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Eliminar cotización
            </Button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="¿Eliminar cotización?"
        description={`Se eliminará permanentemente "${cotizacion.numero_cotizacion}" y todos sus items. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => deleteCotizacion.mutate()}
        loading={deleteCotizacion.isPending}
      />

      <Dialog
        open={postChangeModal !== null}
        onOpenChange={(open) => !open && setPostChangeModal(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Cotización {cotizacion.numero_cotizacion}{" "}
              {postChangeModal === "finalizada" ? "finalizada" : "cancelada"}
            </DialogTitle>
            <DialogDescription>¿Qué deseas hacer ahora?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                setPostChangeModal(null);
                navigate("/cotizaciones/nueva");
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva cotización
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPostChangeModal(null);
                navigate(`/cotizaciones/${cotizacion.id}`);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Ver esta cotización
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPostChangeModal(null);
                navigate("/cotizaciones/lista");
              }}
            >
              <List className="h-4 w-4 mr-2" />
              Ir a la lista de cotizaciones
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
