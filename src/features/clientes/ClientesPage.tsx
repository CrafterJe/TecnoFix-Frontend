import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Pagination } from "@/components/shared/Pagination";
import { ClienteFormDialog } from "./ClienteFormDialog";
import { clientesApi } from "@/api/clientes";
import { formatDate } from "@/lib/helpers";
import type { Cliente } from "@/types";

export function ClientesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editCliente, setEditCliente] = useState<Cliente | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["clientes", page, search],
    queryFn: () => clientesApi.list({ page, page_size: 20, search }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientesApi.delete(id),
    onSuccess: () => {
      toast.success("Cliente eliminado");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Error al eliminar el cliente"),
  });

  const columns: Column<Cliente>[] = [
    { key: "nombre", header: "Nombre", sortable: true },
    { key: "telefono", header: "Teléfono" },
    { key: "email", header: "Correo", render: (r) => r.email || "—" },
    {
      key: "created_at",
      header: "Registrado",
      sortable: true,
      render: (r) => formatDate(r.created_at),
    },
    {
      key: "acciones",
      header: "",
      className: "w-24",
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setEditCliente(r);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(r.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Gestión de clientes del taller"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditCliente(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </Button>
        }
      />

      {/* Filters */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email, teléfono..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <SkeletonTable columns={4} headers={["Nombre", "Teléfono", "Correo", "Registrado"]} />
      ) : !data?.results.length ? (
        <EmptyState
          title="Sin clientes"
          description="Aún no hay clientes registrados en el sistema."
          action={{ label: "Agregar cliente", onClick: () => setFormOpen(true) }}
        />
      ) : (
        <>
          <DataTable
            data={data.results}
            columns={columns}
            getRowId={(r) => r.id}
            onRowClick={(r) => navigate(`/clientes/${r.id}`)}
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

      <ClienteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        cliente={editCliente}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Eliminar cliente"
        description="¿Estás seguro de que deseas eliminar este cliente? También se eliminarán sus dispositivos y órdenes asociadas."
        confirmLabel="Eliminar"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
