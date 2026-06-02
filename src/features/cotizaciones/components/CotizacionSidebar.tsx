import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trash2, FileDown, CheckCircle, XCircle, Loader2, Plus, FileText, List,
  ShieldCheck, ExternalLink, Ban,
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
import type {
  AutorizarCotizacionPayload,
  AutorizarErrorResponse,
  Cotizacion,
  EstadoCotizacion,
} from "@/types";
import { AutorizarCotizacionDialog } from "./AutorizarCotizacionDialog";
import {
  CancelarCotizacionDialog,
  type CancelarCotizacionPayload,
} from "./CancelarCotizacionDialog";
import { PdfPreviewDialog } from "./PdfPreviewDialog";

function extractErrorDetail(e: unknown): string | undefined {
  const data = (e as { response?: { data?: { detail?: string } } })?.response?.data;
  return data?.detail;
}

function extractAutorizarError(e: unknown): AutorizarErrorResponse | undefined {
  const data = (e as { response?: { data?: AutorizarErrorResponse } })?.response?.data;
  if (data && typeof data === "object" && "code" in data) return data;
  return undefined;
}

// Convierte el body 400 de DRF (errores por campo) en un string legible.
// Soporta estructuras anidadas (cliente.nombre, dispositivo.imei, etc.)
function formatDrfErrors(data: Record<string, unknown>, prefix = ""): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      lines.push(`${path}: ${value.join(", ")}`);
    } else if (value && typeof value === "object") {
      const nested = formatDrfErrors(value as Record<string, unknown>, path);
      if (nested) lines.push(nested);
    } else if (typeof value === "string") {
      lines.push(`${path}: ${value}`);
    }
  }
  return lines.join(" · ");
}

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
  const isFinalizada = cotizacion.estado === "finalizada";
  const isAutorizada = cotizacion.estado === "autorizada";
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === "admin";
  const [pdfLoading, setPdfLoading] = useState<"cliente" | "empresa" | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{
    open: boolean;
    blob: Blob | null;
    title: string;
    fileName: string;
  }>({ open: false, blob: null, title: "", fileName: "" });
  const [confirmDel, setConfirmDel] = useState(false);
  const [postChangeModal, setPostChangeModal] = useState<EstadoCotizacion | null>(null);
  const [autorizarOpen, setAutorizarOpen] = useState(false);
  const [cancelarOpen, setCancelarOpen] = useState(false);

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
    onError: (e: unknown) => {
      toast.error(extractErrorDetail(e) || "No se pudo cambiar el estado");
    },
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

  const autorizarMutation = useMutation({
    mutationFn: (payload: AutorizarCotizacionPayload) =>
      cotizacionesApi.autorizar(cotizacion.id, payload),
    onSuccess: ({ cotizacion: updated, orden }) => {
      qc.setQueryData(queryKey, updated);
      qc.invalidateQueries({ queryKey: ["cotizaciones"] });
      qc.invalidateQueries({ queryKey: ["ordenes"] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
      setAutorizarOpen(false);

      // Compone una descripción combinada con info de adelanto y refacciones procesadas.
      const partes: string[] = [];
      if (orden.adelanto_calculo) {
        partes.push(
          `Adelanto: ${formatCurrency(orden.adelanto_calculo.precio_piezas_total)} (${orden.adelanto_calculo.items_considerados} items)`,
        );
      }
      if (orden.refacciones_procesadas && orden.refacciones_procesadas.length > 0) {
        const creadas = orden.refacciones_procesadas.filter((r) => r.creada).length;
        const reusadas = orden.refacciones_procesadas.length - creadas;
        const refsTxt: string[] = [];
        if (creadas) refsTxt.push(`${creadas} nueva${creadas !== 1 ? "s" : ""}`);
        if (reusadas) refsTxt.push(`${reusadas} actualizada${reusadas !== 1 ? "s" : ""}`);
        partes.push(`Refacciones: ${refsTxt.join(" · ")}`);
      }

      toast.success(`Orden ${orden.numero_orden} creada`, {
        description: partes.length > 0 ? partes.join(" · ") : undefined,
      });
      navigate(`/ordenes/${orden.id}`);
    },
    onError: (e: unknown) => {
      const responseData = (e as { response?: { data?: unknown } })?.response?.data;
      console.error("[autorizar] backend response:", responseData);

      const err = extractAutorizarError(e);

      if (err?.code === "stock_insuficiente" && err.refacciones_faltantes) {
        const lista = err.refacciones_faltantes
          .map((r) => `${r.refaccion_nombre}: ${r.stock_actual}/${r.stock_requerido}`)
          .join(" · ");
        toast.error("Stock insuficiente para autorizar", {
          description: `Ajusta el stock en inventario antes de reintentar. Faltantes: ${lista}`,
          duration: 12000,
        });
        return;
      }

      if (err?.code === "adelanto_precio_piezas_mismatch") {
        toast.error("El monto de adelanto no coincide con el costo de piezas", {
          description: `Esperado: ${formatCurrency(err.monto_esperado || "0")} · Recibido: ${formatCurrency(err.monto_recibido || "0")}`,
        });
        return;
      }
      if (err?.code) {
        toast.error(err.detail);
        return;
      }

      // 400: el body trae errores por campo en formato DRF. Mostrar el primero.
      if (responseData && typeof responseData === "object") {
        const formatted = formatDrfErrors(responseData as Record<string, unknown>);
        if (formatted) {
          toast.error("Datos inválidos", { description: formatted });
          return;
        }
      }
      toast.error(extractErrorDetail(e) || "No se pudo autorizar la cotización");
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: (payload: CancelarCotizacionPayload) =>
      cotizacionesApi.reportarCancelacion(cotizacion.id, {
        razon: payload.razon,
        notas: payload.notas,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(queryKey, updated);
      qc.invalidateQueries({ queryKey: ["cotizaciones"] });
      setCancelarOpen(false);
      toast.success("Cancelación registrada");
    },
    onError: (e: unknown) => {
      toast.error(extractErrorDetail(e) || "No se pudo registrar la cancelación");
    },
  });

  function handleAutorizar(payload: AutorizarCotizacionPayload) {
    autorizarMutation.mutate(payload);
  }

  function handleCancelar(payload: CancelarCotizacionPayload) {
    cancelarMutation.mutate(payload);
  }

  async function downloadPdf(tipo: "cliente" | "empresa") {
    setPdfLoading(tipo);
    try {
      const blob = await cotizacionesApi.pdf(cotizacion.id, tipo);
      const sufijo = tipo === "cliente" ? "cliente" : "empresa";
      setPdfPreview({
        open: true,
        blob,
        title: `${cotizacion.numero_cotizacion} — PDF ${sufijo}`,
        fileName: `${cotizacion.numero_cotizacion}-${sufijo}.pdf`,
      });
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

        {(isFinalizada || isAutorizada) && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Orden
              </p>
              {isFinalizada && (
                <>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                    onClick={() => setAutorizarOpen(true)}
                    disabled={cotizacion.items.length === 0}
                    title={cotizacion.items.length === 0 ? "Agrega items primero" : undefined}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                    Autorizar cotización
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => setCancelarOpen(true)}
                  >
                    <Ban className="h-3.5 w-3.5 mr-2" />
                    Reportar cancelación
                  </Button>
                </>
              )}
              {isAutorizada && cotizacion.orden_vinculada && (
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={() => navigate(`/ordenes/${cotizacion.orden_vinculada!.id}`)}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  Ver orden {cotizacion.orden_vinculada.numero_orden}
                </Button>
              )}
            </div>
          </>
        )}

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

      <AutorizarCotizacionDialog
        open={autorizarOpen}
        onOpenChange={setAutorizarOpen}
        cotizacion={cotizacion}
        onAutorizado={handleAutorizar}
        isPending={autorizarMutation.isPending}
      />

      <CancelarCotizacionDialog
        open={cancelarOpen}
        onOpenChange={setCancelarOpen}
        numeroCotizacion={cotizacion.numero_cotizacion}
        onCancelado={handleCancelar}
        isPending={cancelarMutation.isPending}
      />

      <PdfPreviewDialog
        open={pdfPreview.open}
        onOpenChange={(open) =>
          setPdfPreview((prev) => ({ ...prev, open }))
        }
        title={pdfPreview.title}
        fileName={pdfPreview.fileName}
        blob={pdfPreview.blob}
      />

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
