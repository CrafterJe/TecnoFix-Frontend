import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, AlertTriangle, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Pagination } from "@/components/shared/Pagination";
import { inventarioApi } from "@/api/inventario";
import { refaccionSchema, ajusteStockSchema, type RefaccionFormData, type AjusteStockFormData } from "@/lib/schemas";
import { formatCurrency } from "@/lib/helpers";
import { useAuth } from "@/hooks/useAuth";
import type { Refaccion } from "@/types";

export function InventarioPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editRefaccion, setEditRefaccion] = useState<Refaccion | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [ajusteRefaccion, setAjusteRefaccion] = useState<Refaccion | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inventario", page],
    queryFn: () => inventarioApi.list({ page, page_size: 20 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventarioApi.delete(id),
    onSuccess: () => {
      toast.success("Refacción eliminada");
      qc.invalidateQueries({ queryKey: ["inventario"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const columns: Column<Refaccion>[] = [
    {
      key: "nombre",
      header: "Nombre",
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-medium">{r.nombre}</p>
          <p className="text-xs text-muted-foreground">{r.categoria}</p>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className={r.stock <= r.stock_minimo ? "text-destructive font-semibold" : ""}>
            {r.stock}
          </span>
          {r.stock <= r.stock_minimo && (
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          )}
        </div>
      ),
    },
    { key: "stock_minimo", header: "Mín.", render: (r) => r.stock_minimo },
    {
      key: "precio_venta",
      header: "Precio venta",
      render: (r) => formatCurrency(r.precio_venta),
    },
    {
      key: "status",
      header: "Estado",
      render: (r) =>
        r.stock <= r.stock_minimo ? (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border">
            Stock bajo
          </Badge>
        ) : (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
            Normal
          </Badge>
        ),
    },
    {
      key: "acciones",
      header: "",
      className: "w-32",
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Ajustar stock"
            onClick={(e) => {
              e.stopPropagation();
              setAjusteRefaccion(r);
              setAjusteOpen(true);
            }}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
          {isAdmin && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditRefaccion(r);
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
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventario"
        description="Gestión de refacciones y piezas"
        actions={
          isAdmin ? (
            <Button
              size="sm"
              onClick={() => {
                setEditRefaccion(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nueva refacción
            </Button>
          ) : null
        }
      />

      {/* Alerta stock bajo */}
      {data && data.results.some((r) => r.stock <= r.stock_minimo) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-destructive">
              Hay refacciones con stock por debajo del mínimo. Revisa las marcadas en rojo.
            </span>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <SkeletonTable columns={5} />
      ) : !data?.results.length ? (
        <EmptyState
          title="Sin refacciones"
          description="No hay refacciones registradas en el inventario."
          action={isAdmin ? { label: "Agregar refacción", onClick: () => setFormOpen(true) } : undefined}
        />
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

      {/* Form dialog */}
      <RefaccionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        refaccion={editRefaccion}
      />

      {/* Ajuste stock dialog */}
      {ajusteRefaccion && (
        <AjusteStockDialog
          open={ajusteOpen}
          onOpenChange={setAjusteOpen}
          refaccion={ajusteRefaccion}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Eliminar refacción"
        description="¿Estás seguro de que deseas eliminar esta refacción del inventario?"
        confirmLabel="Eliminar"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function RefaccionFormDialog({
  open,
  onOpenChange,
  refaccion,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  refaccion?: Refaccion | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!refaccion;

  const form = useForm<RefaccionFormData>({
    resolver: zodResolver(refaccionSchema),
    defaultValues: refaccion
      ? {
          nombre: refaccion.nombre,
          descripcion: refaccion.descripcion,
          categoria: refaccion.categoria,
          stock: refaccion.stock,
          stock_minimo: refaccion.stock_minimo,
          precio_costo: refaccion.precio_costo,
          precio_venta: refaccion.precio_venta,
        }
      : {
          nombre: "",
          descripcion: "",
          categoria: "",
          stock: 0,
          stock_minimo: 5,
          precio_costo: "0.00",
          precio_venta: "0.00",
        },
  });

  const mutation = useMutation({
    mutationFn: (data: RefaccionFormData) =>
      isEdit ? inventarioApi.update(refaccion!.id, data) : inventarioApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? "Refacción actualizada" : "Refacción creada");
      qc.invalidateQueries({ queryKey: ["inventario"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Error al guardar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar refacción" : "Nueva refacción"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
            className="space-y-3"
          >
            <FormField control={form.control} name="nombre" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl><Input placeholder="Pantalla LCD" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="categoria" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl><Input placeholder="Pantallas" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="stock" render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock inicial</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="stock_minimo" render={({ field }) => (
              <FormItem>
                <FormLabel>Stock mínimo</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="precio_costo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio costo</FormLabel>
                  <FormControl><Input placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="precio_venta" render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio venta</FormLabel>
                  <FormControl><Input placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando..." : isEdit ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AjusteStockDialog({
  open,
  onOpenChange,
  refaccion,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  refaccion: Refaccion;
}) {
  const qc = useQueryClient();
  const form = useForm<AjusteStockFormData>({
    resolver: zodResolver(ajusteStockSchema),
    defaultValues: { cantidad: 1, tipo: "entrada" },
  });

  const mutation = useMutation({
    mutationFn: (data: AjusteStockFormData) =>
      inventarioApi.ajustarStock(refaccion.id, data.cantidad, data.tipo),
    onSuccess: () => {
      toast.success("Stock ajustado");
      qc.invalidateQueries({ queryKey: ["inventario"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Error al ajustar stock"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar stock — {refaccion.nombre}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Stock actual: <strong>{refaccion.stock}</strong> unidades
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="tipo" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de movimiento</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada (agregar)</SelectItem>
                    <SelectItem value="salida">Salida (restar)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="cantidad" render={({ field }) => (
              <FormItem>
                <FormLabel>Cantidad</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando..." : "Aplicar ajuste"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
