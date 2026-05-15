import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Wrench } from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cotizacionesApi } from "@/api/cotizaciones";
import { extractApiError } from "./errorHelper";
import { SortableItem } from "./SortableItem";
import type { TipoReparacion, TipoReparacionPayload } from "@/types";

const tipoSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  categoria: z.coerce.number().int().positive("Selecciona una categoría"),
  activo: z.boolean().default(true),
});

type TipoFormData = z.infer<typeof tipoSchema>;

export function TiposTab() {
  const qc = useQueryClient();
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [dialog, setDialog] = useState<{ open: boolean; editing: TipoReparacion | null }>({ open: false, editing: null });
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; id: number | null; name: string }>({ open: false, id: null, name: "" });

  const { data: categorias } = useQuery({
    queryKey: ["cotizaciones", "categorias"],
    queryFn: cotizacionesApi.categorias.list,
    staleTime: 5 * 60_000,
  });

  const queryKey = ["cotizaciones", "tipos-config", categoriaFiltro];
  const { data: tipos, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      cotizacionesApi.tiposReparacion.list(
        categoriaFiltro !== "todas" ? Number(categoriaFiltro) : undefined
      ),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["cotizaciones", "tipos-config"] });
    qc.invalidateQueries({ queryKey: ["cotizaciones", "tipos"] });
  };

  const deleteTipo = useMutation({
    mutationFn: (id: number) => cotizacionesApi.tiposReparacion.delete(id),
    onSuccess: () => { toast.success("Tipo eliminado"); invalidate(); },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const reorderTipos = useMutation({
    mutationFn: ({ categoriaId, ids }: { categoriaId: number; ids: number[] }) =>
      cotizacionesApi.tiposReparacion.reorder(categoriaId, ids),
    onMutate: async ({ ids }) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<TipoReparacion[]>(queryKey);
      if (previous) {
        const byId = new Map(previous.map((t) => [t.id, t]));
        const reordered = ids.map((id) => byId.get(id)).filter(Boolean) as TipoReparacion[];
        qc.setQueryData<TipoReparacion[]>(queryKey, reordered);
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
      toast.error(extractApiError(err) || "No se pudo reordenar");
    },
    onSuccess: () => invalidate(),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const dragEnabled = categoriaFiltro !== "todas";

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !tipos || !dragEnabled) return;
    const oldIndex = tipos.findIndex((t) => t.id === Number(active.id));
    const newIndex = tipos.findIndex((t) => t.id === Number(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(tipos, oldIndex, newIndex);
    reorderTipos.mutate({
      categoriaId: Number(categoriaFiltro),
      ids: reordered.map((t) => t.id),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3 flex-wrap">
        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {categorias?.map((c) => (
              <SelectItem key={c.id} value={c.id.toString()}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={() => setDialog({ open: true, editing: null })}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nuevo tipo
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : tipos?.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">
          No hay tipos de reparación
          {categoriaFiltro !== "todas" ? " en esta categoría" : ""}.
        </p>
      ) : (
        <>
          {!dragEnabled && (
            <p className="text-xs text-muted-foreground italic">
              Filtra por una categoría para reordenar los tipos arrastrándolos.
            </p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tipos?.map((t) => t.id) ?? []}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {tipos?.map((tipo) => (
                  <SortableItem key={tipo.id} id={tipo.id} disabled={!dragEnabled}>
                    <Card>
                      <CardContent className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{tipo.nombre}</span>
                              {!tipo.activo && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  Inactivo
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {tipo.categoria_nombre} · {tipo.formulas.length} fórmula
                              {tipo.formulas.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDialog({ open: true, editing: tipo })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() =>
                              setConfirmDel({ open: true, id: tipo.id, name: tipo.nombre })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      <TipoDialog
        open={dialog.open}
        editing={dialog.editing}
        onOpenChange={(open) => setDialog({ open, editing: open ? dialog.editing : null })}
        onSuccess={invalidate}
      />

      <ConfirmDialog
        open={confirmDel.open}
        onOpenChange={(open) => !open && setConfirmDel({ open: false, id: null, name: "" })}
        title="¿Eliminar tipo de reparación?"
        description={`Se eliminará "${confirmDel.name}" y todas sus fórmulas asociadas.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => {
          if (confirmDel.id) deleteTipo.mutate(confirmDel.id);
          setConfirmDel({ open: false, id: null, name: "" });
        }}
        loading={deleteTipo.isPending}
      />
    </div>
  );
}

function TipoDialog({
  open, editing, onOpenChange, onSuccess,
}: {
  open: boolean;
  editing: TipoReparacion | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const isEdit = !!editing;

  const { data: categorias } = useQuery({
    queryKey: ["cotizaciones", "categorias"],
    queryFn: cotizacionesApi.categorias.list,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const form = useForm<TipoFormData>({
    resolver: zodResolver(tipoSchema),
    values: editing
      ? {
          nombre: editing.nombre,
          categoria: editing.categoria,
          activo: editing.activo,
        }
      : { nombre: "", categoria: 0, activo: true },
  });

  const mutation = useMutation({
    mutationFn: (data: TipoFormData) => {
      if (isEdit) {
        const payload: TipoReparacionPayload = {
          nombre: data.nombre,
          categoria: data.categoria,
          activo: data.activo,
        };
        return cotizacionesApi.tiposReparacion.update(editing!.id, payload);
      }
      // Crear: nombre + categoría. El back asigna orden y default activo=true.
      const payload: TipoReparacionPayload = {
        nombre: data.nombre,
        categoria: data.categoria,
      };
      return cotizacionesApi.tiposReparacion.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Tipo actualizado" : "Tipo creado");
      onSuccess();
      onOpenChange(false);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar tipo de reparación" : "Nuevo tipo de reparación"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="nombre" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl><Input placeholder="Ej: Display" {...field} autoFocus /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="categoria" render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select
                  value={field.value > 0 ? field.value.toString() : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categorias?.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            {isEdit && (
              <FormField control={form.control} name="activo" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Activo</FormLabel>
                </FormItem>
              )} />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
