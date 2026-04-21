import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Wrench, User, Calendar, DollarSign, ImagePlus, Trash2, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ordenesApi } from "@/api/ordenes";
import { usersApi } from "@/api/users";
import { inventarioApi } from "@/api/inventario";
import { formatDate, formatCurrency, ESTADO_LABELS, TIPO_DISPOSITIVO_LABELS } from "@/lib/helpers";
import { useAuth } from "@/hooks/useAuth";
import type { EstadoOrden } from "@/types";

const ESTADOS: EstadoOrden[] = [
  "recibido", "diagnostico", "esperando_refaccion", "en_reparacion", "listo", "entregado",
];

export function OrdenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const ordenId = Number(id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [refaccionId, setRefaccionId] = useState("");
  const [refaccionQty, setRefaccionQty] = useState("1");
  const [diagnostico, setDiagnostico] = useState("");
  const [costoEstimado, setCostoEstimado] = useState("");

  const { data: orden, isLoading } = useQuery({
    queryKey: ["ordenes", ordenId],
    queryFn: () => ordenesApi.get(ordenId),
    enabled: !!ordenId,
  });

  const { data: evidencias } = useQuery({
    queryKey: ["evidencias", ordenId],
    queryFn: () => ordenesApi.evidencias.list({ orden: ordenId }),
    enabled: !!ordenId,
  });

  const { data: tecnicos } = useQuery({
    queryKey: ["users", "tecnicos"],
    queryFn: () => usersApi.list({ page_size: 100 }),
    select: (d) => d.results.filter((u) => u.rol === "tecnico"),
    enabled: isAdmin,
  });

  const { data: refacciones } = useQuery({
    queryKey: ["inventario", "all"],
    queryFn: () => inventarioApi.list({ page_size: 100 }),
  });

  const cambiarEstadoMutation = useMutation({
    mutationFn: (estado: EstadoOrden) => ordenesApi.cambiarEstado(ordenId, estado),
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["ordenes", ordenId] });
    },
    onError: () => toast.error("Error al cambiar estado"),
  });

  const asignarTecnicoMutation = useMutation({
    mutationFn: (tecnicoId: number) => ordenesApi.asignarTecnico(ordenId, tecnicoId),
    onSuccess: () => {
      toast.success("Técnico asignado");
      qc.invalidateQueries({ queryKey: ["ordenes", ordenId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { diagnostico?: string; costo_estimado?: string }) =>
      ordenesApi.update(ordenId, data),
    onSuccess: () => {
      toast.success("Orden actualizada");
      qc.invalidateQueries({ queryKey: ["ordenes", ordenId] });
    },
  });

  const agregarRefaccionMutation = useMutation({
    mutationFn: () =>
      ordenesApi.agregarRefaccion(ordenId, Number(refaccionId), Number(refaccionQty)),
    onSuccess: () => {
      toast.success("Refacción agregada");
      setRefaccionId("");
      setRefaccionQty("1");
      qc.invalidateQueries({ queryKey: ["ordenes", ordenId] });
    },
    onError: () => toast.error("Error al agregar refacción"),
  });

  const uploadEvidenciaMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("orden", ordenId.toString());
      fd.append("imagen", file);
      fd.append("tipo", "proceso");
      return ordenesApi.evidencias.create(fd);
    },
    onSuccess: () => {
      toast.success("Evidencia subida");
      qc.invalidateQueries({ queryKey: ["evidencias", ordenId] });
    },
    onError: () => toast.error("Error al subir imagen"),
  });

  const deleteEvidenciaMutation = useMutation({
    mutationFn: (evidId: number) => ordenesApi.evidencias.delete(evidId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evidencias", ordenId] });
    },
  });

  const deleteOrdenMutation = useMutation({
    mutationFn: () => ordenesApi.delete(ordenId),
    onSuccess: () => {
      toast.success("Orden eliminada");
      navigate("/ordenes");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!orden) return <p className="text-muted-foreground">Orden no encontrada</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={orden.numero_orden}
        breadcrumbs={[{ label: "Órdenes", href: "/ordenes" }, { label: orden.numero_orden }]}
        actions={
          <div className="flex gap-2">
            {isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Info general */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Información de la orden</CardTitle>
            <StatusBadge estado={orden.estado} />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{orden.dispositivo?.cliente?.nombre}</p>
                <p className="text-muted-foreground">
                  {TIPO_DISPOSITIVO_LABELS[orden.dispositivo?.tipo]} —{" "}
                  {orden.dispositivo?.marca} {orden.dispositivo?.modelo}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p>{orden.problema_reportado}</p>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{formatDate(orden.created_at)}</span>
            </div>
            {(orden.costo_estimado || orden.costo_final) && (
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>
                  Est: {formatCurrency(orden.costo_estimado)} / Final:{" "}
                  {formatCurrency(orden.costo_final)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gestión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cambiar estado</label>
              <Select
                value={orden.estado}
                onValueChange={(v) => cambiarEstadoMutation.mutate(v as EstadoOrden)}
                disabled={cambiarEstadoMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e} value={e}>{ESTADO_LABELS[e]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin && tecnicos && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Asignar técnico</label>
                <Select
                  value={orden.assigned_to?.id?.toString() ?? ""}
                  onValueChange={(v) => asignarTecnicoMutation.mutate(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    {tecnicos.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Diagnóstico</label>
              <Textarea
                value={diagnostico || orden.diagnostico || ""}
                onChange={(e) => setDiagnostico(e.target.value)}
                placeholder="Escribe el diagnóstico técnico..."
                rows={3}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateMutation.mutate({ diagnostico })}
                disabled={updateMutation.isPending}
              >
                Guardar diagnóstico
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Costo estimado (MXN)</label>
              <div className="flex gap-2">
                <Input
                  value={costoEstimado || orden.costo_estimado || ""}
                  onChange={(e) => setCostoEstimado(e.target.value)}
                  placeholder="0.00"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateMutation.mutate({ costo_estimado: costoEstimado })}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refacciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Refacciones utilizadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={refaccionId} onValueChange={setRefaccionId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecciona una refacción" />
              </SelectTrigger>
              <SelectContent>
                {refacciones?.results.map((r) => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    {r.nombre} (stock: {r.stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              value={refaccionQty}
              onChange={(e) => setRefaccionQty(e.target.value)}
              className="w-20"
            />
            <Button
              size="sm"
              onClick={() => agregarRefaccionMutation.mutate()}
              disabled={!refaccionId || agregarRefaccionMutation.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Evidencias */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Evidencias fotográficas</CardTitle>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
            Subir imagen
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadEvidenciaMutation.mutate(file);
              e.target.value = "";
            }}
          />
        </CardHeader>
        <CardContent>
          {!evidencias?.results.length ? (
            <p className="text-sm text-muted-foreground">Sin evidencias subidas</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {evidencias.results.map((ev) => (
                <div key={ev.id} className="relative group aspect-square">
                  <img
                    src={ev.imagen}
                    alt="Evidencia"
                    className="w-full h-full object-cover rounded-md border"
                  />
                  <button
                    onClick={() => deleteEvidenciaMutation.mutate(ev.id)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                    {ev.tipo}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar orden"
        description={`¿Deseas eliminar la orden ${orden.numero_orden}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar orden"
        onConfirm={() => deleteOrdenMutation.mutate()}
        loading={deleteOrdenMutation.isPending}
      />
    </div>
  );
}
