import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Pagination } from "@/components/shared/Pagination";
import { ordenesApi } from "@/api/ordenes";
import { usersApi } from "@/api/users";
import { formatDate, ESTADO_LABELS } from "@/lib/helpers";
import type { Orden, EstadoOrden } from "@/types";

const ESTADOS: EstadoOrden[] = [
  "recibido", "diagnostico", "esperando_refaccion", "en_reparacion", "listo", "entregado",
];

export function OrdenesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [estadoFilter, setEstadoFilter] = useState<EstadoOrden | "todos">("todos");
  const [tecnicoFilter, setTecnicoFilter] = useState<number | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ["ordenes", page, estadoFilter, tecnicoFilter],
    queryFn: () =>
      ordenesApi.list({
        page,
        page_size: 20,
        estado: estadoFilter !== "todos" ? estadoFilter : undefined,
        assigned_to: tecnicoFilter,
      }),
  });

  const { data: tecnicos } = useQuery({
    queryKey: ["users", "tecnicos"],
    queryFn: () => usersApi.list({ page_size: 100 }),
    select: (d) => d.results.filter((u) => u.rol === "tecnico"),
  });

  const columns: Column<Orden>[] = [
    {
      key: "numero_orden",
      header: "N° Orden",
      sortable: true,
      render: (r) => <span className="font-order font-medium">{r.numero_orden}</span>,
    },
    {
      key: "cliente",
      header: "Cliente",
      render: (r) => r.dispositivo?.cliente?.nombre ?? "—",
    },
    {
      key: "dispositivo",
      header: "Dispositivo",
      render: (r) =>
        r.dispositivo ? `${r.dispositivo.marca} ${r.dispositivo.modelo}` : "—",
    },
    {
      key: "estado",
      header: "Estado",
      sortable: true,
      render: (r) => <StatusBadge estado={r.estado} />,
    },
    {
      key: "assigned_to",
      header: "Técnico",
      render: (r) => r.assigned_to?.nombre ?? <span className="text-muted-foreground">Sin asignar</span>,
    },
    {
      key: "created_at",
      header: "Fecha",
      sortable: true,
      render: (r) => formatDate(r.created_at),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Órdenes de servicio"
        description="Gestión de órdenes del taller"
        actions={
          <Button size="sm" onClick={() => navigate("/ordenes/nueva")}>
            <Plus className="h-4 w-4" />
            Nueva orden
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select
          value={estadoFilter}
          onValueChange={(v) => { setEstadoFilter(v as EstadoOrden | "todos"); setPage(1); }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>{ESTADO_LABELS[e]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {tecnicos && tecnicos.length > 0 && (
          <Select
            value={tecnicoFilter?.toString() ?? "todos"}
            onValueChange={(v) => { setTecnicoFilter(v === "todos" ? undefined : Number(v)); setPage(1); }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Técnico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los técnicos</SelectItem>
              {tecnicos.map((t) => (
                <SelectItem key={t.id} value={t.id.toString()}>{t.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <SkeletonTable columns={6} />
      ) : !data?.results.length ? (
        <EmptyState
          title="Sin órdenes"
          description="No hay órdenes con los filtros seleccionados."
          action={{ label: "Nueva orden", onClick: () => navigate("/ordenes/nueva") }}
        />
      ) : (
        <>
          <DataTable
            data={data.results}
            columns={columns}
            getRowId={(r) => r.id}
            onRowClick={(r) => navigate(`/ordenes/${r.id}`)}
          />
          <Pagination
            currentPage={data.current_page}
            totalPages={data.total_pages}
            count={data.count}
            pageSize={20}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
