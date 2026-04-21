import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Wrench, Package, CheckCircle, Plus, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ordenesApi } from "@/api/ordenes";
import { inventarioApi } from "@/api/inventario";
import { formatDate } from "@/lib/helpers";
import type { Orden } from "@/types";

function KpiCard({
  title,
  value,
  icon: Icon,
  loading,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  loading?: boolean;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`rounded-lg p-3 ${color ?? "bg-primary/10"}`}>
          <Icon className={`h-5 w-5 ${color ? "text-white" : "text-primary"}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-7 w-12 mt-1" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();

  const { data: ordenesHoy, isLoading: loadingHoy } = useQuery({
    queryKey: ["ordenes", "hoy"],
    queryFn: () => {
      const today = new Date().toISOString().split("T")[0];
      return ordenesApi.list({ fecha_inicio: today, fecha_fin: today, page_size: 1 });
    },
  });

  const { data: enReparacion, isLoading: loadingRep } = useQuery({
    queryKey: ["ordenes", "en_reparacion"],
    queryFn: () => ordenesApi.list({ estado: "en_reparacion", page_size: 1 }),
  });

  const { data: listos, isLoading: loadingListos } = useQuery({
    queryKey: ["ordenes", "listo"],
    queryFn: () => ordenesApi.list({ estado: "listo", page_size: 1 }),
  });

  const { data: bajosStock, isLoading: loadingStock } = useQuery({
    queryKey: ["inventario", "bajo_stock"],
    queryFn: () => inventarioApi.list({ bajo_stock: true, page_size: 1 }),
  });

  const { data: recientes, isLoading: loadingRecientes } = useQuery({
    queryKey: ["ordenes", "recientes"],
    queryFn: () => ordenesApi.list({ page_size: 10 }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Resumen de actividad del taller"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => navigate("/ordenes/nueva")}>
              <Plus className="h-4 w-4" />
              Nueva orden
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/clientes")}>
              <UserPlus className="h-4 w-4" />
              Nuevo cliente
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Órdenes hoy"
          value={ordenesHoy?.count ?? 0}
          icon={ClipboardList}
          loading={loadingHoy}
          color="bg-blue-500/20"
        />
        <KpiCard
          title="En reparación"
          value={enReparacion?.count ?? 0}
          icon={Wrench}
          loading={loadingRep}
          color="bg-yellow-500/20"
        />
        <KpiCard
          title="Stock bajo mínimo"
          value={bajosStock?.count ?? 0}
          icon={Package}
          loading={loadingStock}
          color="bg-red-500/20"
        />
        <KpiCard
          title="Listas para entregar"
          value={listos?.count ?? 0}
          icon={CheckCircle}
          loading={loadingListos}
          color="bg-green-500/20"
        />
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Órdenes recientes</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/ordenes")}>
            Ver todas
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRecientes ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (recientes?.results ?? []).length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No hay órdenes registradas
            </p>
          ) : (
            <div className="divide-y">
              {(recientes?.results ?? []).map((orden: Orden) => (
                <div
                  key={orden.id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/ordenes/${orden.id}`)}
                >
                  <div className="space-y-0.5">
                    <p className="font-order text-sm font-medium">{orden.numero_orden}</p>
                    <p className="text-xs text-muted-foreground">
                      {orden.dispositivo?.cliente?.nombre} —{" "}
                      {orden.dispositivo?.marca} {orden.dispositivo?.modelo}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {formatDate(orden.created_at)}
                    </p>
                    <StatusBadge estado={orden.estado} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
