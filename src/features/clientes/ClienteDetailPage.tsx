import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Phone, Mail, Calendar, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ClienteFormDialog } from "./ClienteFormDialog";
import { clientesApi } from "@/api/clientes";
import { ordenesApi } from "@/api/ordenes";
import { formatDate, TIPO_DISPOSITIVO_LABELS } from "@/lib/helpers";

export function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clienteId = Number(id);
  const [editOpen, setEditOpen] = useState(false);

  const { data: cliente, isLoading: loadingCliente } = useQuery({
    queryKey: ["clientes", clienteId],
    queryFn: () => clientesApi.get(clienteId),
    enabled: !!clienteId,
  });

  const { data: dispositivos, isLoading: loadingDisp } = useQuery({
    queryKey: ["dispositivos", clienteId],
    queryFn: () => clientesApi.dispositivos.list({ cliente: clienteId, page_size: 50 }),
    enabled: !!clienteId,
  });

  const { data: ordenes, isLoading: loadingOrdenes } = useQuery({
    queryKey: ["ordenes", "cliente", clienteId],
    queryFn: () => ordenesApi.list({ page_size: 20 }),
    enabled: !!clienteId,
  });

  const clienteOrdenes = ordenes?.results.filter(
    (o) => o.dispositivo?.cliente?.id === clienteId
  );

  if (loadingCliente) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!cliente) return <p className="text-muted-foreground">Cliente no encontrado</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={cliente.nombre}
        breadcrumbs={[{ label: "Clientes", href: "/clientes" }, { label: cliente.nombre }]}
        actions={
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{cliente.telefono}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{cliente.email || "Sin correo"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Registrado el {formatDate(cliente.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Dispositivos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Dispositivos</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => navigate("/ordenes/nueva")}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingDisp ? (
              <Skeleton className="h-16 w-full" />
            ) : !dispositivos?.results.length ? (
              <p className="text-sm text-muted-foreground">Sin dispositivos registrados</p>
            ) : (
              <div className="space-y-2">
                {dispositivos.results.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 p-2 rounded-md border">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {d.marca} {d.modelo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {TIPO_DISPOSITIVO_LABELS[d.tipo]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de órdenes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de órdenes</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingOrdenes ? (
            <Skeleton className="h-20 w-full" />
          ) : !clienteOrdenes?.length ? (
            <EmptyState
              title="Sin órdenes"
              description="Este cliente no tiene órdenes registradas."
            />
          ) : (
            <div className="divide-y">
              {clienteOrdenes.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between py-3 cursor-pointer hover:opacity-80"
                  onClick={() => navigate(`/ordenes/${o.id}`)}
                >
                  <div>
                    <p className="font-order text-sm font-medium">{o.numero_orden}</p>
                    <p className="text-xs text-muted-foreground">{o.problema_reportado}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {o.dispositivo?.marca} {o.dispositivo?.modelo}
                    </Badge>
                    <StatusBadge estado={o.estado} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ClienteFormDialog open={editOpen} onOpenChange={setEditOpen} cliente={cliente} />
    </div>
  );
}
