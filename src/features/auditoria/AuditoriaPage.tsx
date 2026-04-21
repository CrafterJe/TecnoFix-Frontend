import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, RotateCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Pagination } from "@/components/shared/Pagination";
import { auditoriaApi } from "@/api/auditoria";
import { formatDate, AUDIT_ACTION_LABELS, AUDIT_ACTION_COLORS } from "@/lib/helpers";
import type { AuditLog, AuditAction } from "@/types";

const FIELD_LABELS: Record<string, string> = {
  estado: "Estado",
  nombre: "Nombre",
  email: "Correo",
  rol: "Rol",
  activo: "Activo",
  telefono: "Teléfono",
  problema_reportado: "Problema reportado",
  diagnostico: "Diagnóstico",
  costo_estimado: "Costo estimado",
  costo_final: "Costo final",
  assigned_to: "Asignado a",
  received_by: "Recibido por",
  created_by: "Creado por",
  delivered_by: "Entregado por",
  dispositivo: "Dispositivo",
  marca: "Marca",
  modelo: "Modelo",
  tipo: "Tipo",
  cliente: "Cliente",
  stock: "Stock",
  stock_minimo: "Stock mínimo",
  precio_costo: "Precio costo",
  precio_venta: "Precio venta",
  categoria: "Categoría",
  descripcion: "Descripción",
  password: "Contraseña",
};

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function AuditChanges({ log }: { log: AuditLog }) {
  const { action, old_value, new_value } = log;

  if (action === "LOGIN" || (!old_value && !new_value)) {
    return <p className="text-sm text-muted-foreground">Sin datos adicionales.</p>;
  }

  if (action === "CREATE" && new_value) {
    const entries = Object.entries(new_value).filter(
      ([k]) => !["id", "created_at", "updated_at"].includes(k)
    );
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="pb-2 font-medium w-1/3">Campo</th>
            <th className="pb-2 font-medium">Valor</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k} className="border-b border-border/50">
              <td className="py-2 text-muted-foreground">{FIELD_LABELS[k] ?? k}</td>
              <td className="py-2 font-medium">{formatFieldValue(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (action === "DELETE" && old_value) {
    const entries = Object.entries(old_value).filter(
      ([k]) => !["id", "created_at", "updated_at"].includes(k)
    );
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="pb-2 font-medium w-1/3">Campo</th>
            <th className="pb-2 font-medium">Valor eliminado</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k} className="border-b border-border/50">
              <td className="py-2 text-muted-foreground">{FIELD_LABELS[k] ?? k}</td>
              <td className="py-2 font-medium text-destructive">{formatFieldValue(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (old_value && new_value) {
    const changed = Object.keys(new_value).filter(
      (k) => JSON.stringify(old_value[k]) !== JSON.stringify(new_value[k])
        && !["updated_at"].includes(k)
    );
    if (!changed.length) {
      return <p className="text-sm text-muted-foreground">Sin cambios detectados.</p>;
    }
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="pb-2 font-medium w-1/3">Campo</th>
            <th className="pb-2 font-medium w-1/3">Antes</th>
            <th className="pb-2 w-6" />
            <th className="pb-2 font-medium">Después</th>
          </tr>
        </thead>
        <tbody>
          {changed.map((k) => (
            <tr key={k} className="border-b border-border/50">
              <td className="py-2 text-muted-foreground">{FIELD_LABELS[k] ?? k}</td>
              <td className="py-2">
                <span className="inline-block bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
                  {formatFieldValue(old_value[k])}
                </span>
              </td>
              <td className="py-2"><ArrowRight className="h-3 w-3 text-muted-foreground" /></td>
              <td className="py-2">
                <span className="inline-block bg-accent/20 text-accent rounded px-2 py-0.5 text-xs font-medium">
                  {formatFieldValue(new_value[k])}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return null;
}

const ACTIONS: AuditAction[] = ["CREATE", "UPDATE", "DELETE", "ASSIGN", "STATUS_CHANGE", "LOGIN"];
const ENTITIES = ["orden", "cliente", "dispositivo", "refaccion", "user"];

export function AuditoriaPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<AuditAction | "todos">("todos");
  const [entityFilter, setEntityFilter] = useState<string>("todos");
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["auditoria", page, actionFilter, entityFilter],
    queryFn: () =>
      auditoriaApi.list({
        page,
        page_size: 20,
        action: actionFilter !== "todos" ? actionFilter : undefined,
        entity: entityFilter !== "todos" ? entityFilter : undefined,
      }),
  });

  const columns: Column<AuditLog>[] = [
    {
      key: "created_at",
      header: "Fecha y hora",
      sortable: true,
      render: (r) => formatDate(r.created_at),
    },
    {
      key: "user",
      header: "Usuario",
      render: (r) => r.user_nombre,
    },
    {
      key: "action",
      header: "Acción",
      render: (r) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${AUDIT_ACTION_COLORS[r.action]}`}
        >
          {r.action_display}
        </span>
      ),
    },
    {
      key: "entity",
      header: "Entidad",
      render: (r) => (
        <span className="capitalize">
          {r.entity} #{r.entity_id}
        </span>
      ),
    },
    {
      key: "ip_address",
      header: "IP",
      render: (r) => <span className="font-mono text-xs">{r.ip_address}</span>,
    },
    {
      key: "detalle",
      header: "",
      className: "w-12",
      render: (r) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            setDetailLog(r);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Auditoría"
        description="Registro de actividad y cambios en el sistema"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RotateCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refrescar
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select
          value={actionFilter}
          onValueChange={(v) => { setActionFilter(v as AuditAction | "todos"); setPage(1); }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las acciones</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>{AUDIT_ACTION_LABELS[a]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={entityFilter}
          onValueChange={(v) => { setEntityFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las entidades</SelectItem>
            {ENTITIES.map((e) => (
              <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SkeletonTable columns={5} />
      ) : !data?.results.length ? (
        <EmptyState title="Sin registros" description="No hay registros de auditoría con los filtros seleccionados." />
      ) : (
        <>
          <DataTable data={data.results} columns={columns} getRowId={(r) => r.id} />
          <Pagination
            currentPage={data.current_page}
            totalPages={data.total_pages}
            count={data.count}
            pageSize={20}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailLog} onOpenChange={(o) => !o && setDetailLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Detalle de auditoría
              {detailLog && (
                <Badge
                  className={`${AUDIT_ACTION_COLORS[detailLog.action]} border-0`}
                >
                  {AUDIT_ACTION_LABELS[detailLog.action]}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 pb-2 border-b border-border">
                <div>
                  <p className="text-muted-foreground">Usuario</p>
                  <p className="font-medium">{detailLog.user_nombre}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDate(detailLog.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entidad</p>
                  <p className="font-medium capitalize">{detailLog.entity} #{detailLog.entity_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dirección IP</p>
                  <p className="font-mono">{detailLog.ip_address}</p>
                </div>
              </div>
              <ScrollArea className="max-h-72">
                <AuditChanges log={detailLog} />
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
