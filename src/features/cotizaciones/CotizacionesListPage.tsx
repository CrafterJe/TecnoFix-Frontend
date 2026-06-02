import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Search, Plus, X, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cotizacionesApi } from "@/api/cotizaciones";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency, formatDateShort } from "@/lib/helpers";
import type { Cotizacion, EstadoCotizacion } from "@/types";

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

const MESES = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

// Last 6 years (current + 5 anteriores)
const currentYear = new Date().getFullYear();
const AÑOS = Array.from({ length: 6 }, (_, i) => currentYear - i);

export function CotizacionesListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === "admin";

  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<EstadoCotizacion | "todos">("todos");
  const [anio, setAnio] = useState<string>("todos");
  const [mes, setMes] = useState<string>("todos");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<Cotizacion | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cotizacionesApi.delete(id),
    onSuccess: () => {
      toast.success("Cotización eliminada");
      qc.invalidateQueries({ queryKey: ["cotizaciones"] });
      setConfirmDelete(null);
    },
    onError: () => {
      toast.error("No se pudo eliminar la cotización");
      setConfirmDelete(null);
    },
  });

  const filtersActive =
    search !== "" ||
    estado !== "todos" ||
    anio !== "todos" ||
    mes !== "todos";

  function clearFilters() {
    setSearch("");
    setEstado("todos");
    setAnio("todos");
    setMes("todos");
    setPage(1);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["cotizaciones", { search, estado, anio, mes, page }],
    queryFn: () =>
      cotizacionesApi.list({
        search: search || undefined,
        estado: estado !== "todos" ? estado : undefined,
        anio: anio !== "todos" ? Number(anio) : undefined,
        mes: mes !== "todos" ? Number(mes) : undefined,
        page,
        page_size: 20,
      }),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cotizaciones"
        description="Historial de cotizaciones de reparación"
        backTo="/cotizaciones"
        backLabel="Volver a Cotizaciones"
        breadcrumbs={[
          { label: "Cotizaciones", href: "/cotizaciones" },
          { label: "Todas" },
        ]}
        actions={
          <Button onClick={() => navigate("/cotizaciones/nueva")}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva cotización
          </Button>
        }
      />

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número o cliente..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select
          value={estado}
          onValueChange={(v) => { setEstado(v as EstadoCotizacion | "todos"); setPage(1); }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="finalizada">Finalizada</SelectItem>
            <SelectItem value="autorizada">Autorizada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={anio}
          onValueChange={(v) => { setAnio(v); setPage(1); }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los años</SelectItem>
            {AÑOS.map((a) => (
              <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={mes}
          onValueChange={(v) => { setMes(v); setPage(1); }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los meses</SelectItem>
            {MESES.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : data?.results.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No se encontraron cotizaciones</p>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-3">
              <X className="h-3.5 w-3.5 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.results.map((cot) => (
            <Card
              key={cot.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all flex flex-col"
              onClick={() => navigate(`/cotizaciones/${cot.id}`)}
            >
              <CardContent className="p-5 flex flex-col flex-1 gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="outline" className={ESTADO_COLORS[cot.estado]}>
                    {ESTADO_LABELS[cot.estado]}
                  </Badge>
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-sm tabular-nums truncate">
                    {cot.numero_cotizacion}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {cot.nombre_cliente}
                  </p>
                </div>

                <div className="flex-1 flex items-end">
                  <p className="text-xl font-bold tabular-nums">
                    {formatCurrency(cot.total)}
                  </p>
                </div>

                <div className="border-t pt-2 -mx-1 px-1 flex justify-between items-center text-[11px] text-muted-foreground gap-2">
                  <span className="truncate">{formatDateShort(cot.created_at)}</span>
                  <div className="flex items-center gap-2">
                    {cot.created_by_nombre && (
                      <span className="truncate">por {cot.created_by_nombre}</span>
                    )}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(cot);
                        }}
                        className="text-muted-foreground/60 hover:text-destructive transition-colors p-0.5 -m-0.5"
                        title="Eliminar cotización"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {cot.notas && (
                  <p className="text-xs text-muted-foreground line-clamp-2 -mt-1">
                    {cot.notas}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="¿Eliminar cotización?"
        description={
          confirmDelete
            ? `Se eliminará permanentemente "${confirmDelete.numero_cotizacion}" — ${confirmDelete.nombre_cliente}. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        loading={deleteMutation.isPending}
      />

      {data && data.total_pages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {data.current_page} de {data.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
