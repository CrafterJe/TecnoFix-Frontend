import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
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

const ACTIONS: AuditAction[] = ["CREATE", "UPDATE", "DELETE", "ASSIGN", "STATUS_CHANGE", "LOGIN"];
const ENTITIES = ["orden", "cliente", "dispositivo", "refaccion", "user"];

export function AuditoriaPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<AuditAction | "todos">("todos");
  const [entityFilter, setEntityFilter] = useState<string>("todos");
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const { data, isLoading } = useQuery({
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
      render: (r) => r.user?.nombre ?? "Sistema",
    },
    {
      key: "action",
      header: "Acción",
      render: (r) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${AUDIT_ACTION_COLORS[r.action]}`}
        >
          {AUDIT_ACTION_LABELS[r.action]}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Usuario</p>
                  <p className="font-medium">{detailLog.user?.nombre ?? "Sistema"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDate(detailLog.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entidad</p>
                  <p className="font-medium capitalize">
                    {detailLog.entity} #{detailLog.entity_id}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dirección IP</p>
                  <p className="font-mono">{detailLog.ip_address}</p>
                </div>
              </div>

              {detailLog.old_value && (
                <div>
                  <p className="text-muted-foreground mb-1">Valor anterior</p>
                  <ScrollArea className="h-32 rounded-md border bg-muted/50 p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(detailLog.old_value, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {detailLog.new_value && (
                <div>
                  <p className="text-muted-foreground mb-1">Valor nuevo</p>
                  <ScrollArea className="h-32 rounded-md border bg-muted/50 p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(detailLog.new_value, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
