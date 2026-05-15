import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, ChevronRight } from "lucide-react";
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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cotizacionesApi } from "@/api/cotizaciones";
import { extractApiError } from "./errorHelper";
import { SortableItem } from "./SortableItem";
import type {
  CategoriaDispositivo, SubcategoriaDispositivo,
  CategoriaPayload, SubcategoriaPayload,
} from "@/types";

const categoriaSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  activo: z.boolean().default(true),
});

const subcategoriaSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  activo: z.boolean().default(true),
});

type CategoriaFormData = z.infer<typeof categoriaSchema>;
type SubcategoriaFormData = z.infer<typeof subcategoriaSchema>;

export function CategoriasTab() {
  const qc = useQueryClient();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [catDialog, setCatDialog] = useState<{ open: boolean; editing: CategoriaDispositivo | null }>({ open: false, editing: null });
  const [subDialog, setSubDialog] = useState<{ open: boolean; categoriaId: number | null; editing: SubcategoriaDispositivo | null }>({ open: false, categoriaId: null, editing: null });
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; type: "categoria" | "subcategoria" | null; id: number | null; name: string }>({ open: false, type: null, id: null, name: "" });

  const queryKey = ["cotizaciones", "categorias"];
  const { data: categorias, isLoading } = useQuery({
    queryKey,
    queryFn: cotizacionesApi.categorias.list,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });

  const deleteCategoria = useMutation({
    mutationFn: (id: number) => cotizacionesApi.categorias.delete(id),
    onSuccess: () => { toast.success("Categoría eliminada"); invalidate(); },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const deleteSubcategoria = useMutation({
    mutationFn: (id: number) => cotizacionesApi.subcategorias.delete(id),
    onSuccess: () => { toast.success("Subcategoría eliminada"); invalidate(); },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const reorderCategorias = useMutation({
    mutationFn: (ids: number[]) => cotizacionesApi.categorias.reorder(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<CategoriaDispositivo[]>(queryKey);
      if (previous) {
        const byId = new Map(previous.map((c) => [c.id, c]));
        const reordered = ids.map((id) => byId.get(id)).filter(Boolean) as CategoriaDispositivo[];
        qc.setQueryData<CategoriaDispositivo[]>(queryKey, reordered);
      }
      return { previous };
    },
    onError: (err, _ids, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
      toast.error(extractApiError(err) || "No se pudo reordenar");
    },
    onSuccess: (data) => qc.setQueryData(queryKey, data),
  });

  const reorderSubcategorias = useMutation({
    mutationFn: ({ categoriaId, ids }: { categoriaId: number; ids: number[] }) =>
      cotizacionesApi.subcategorias.reorder(categoriaId, ids),
    onMutate: async ({ categoriaId, ids }) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<CategoriaDispositivo[]>(queryKey);
      if (previous) {
        const next = previous.map((cat) => {
          if (cat.id !== categoriaId) return cat;
          const byId = new Map(cat.subcategorias.map((s) => [s.id, s]));
          const reordered = ids
            .map((id) => byId.get(id))
            .filter(Boolean) as SubcategoriaDispositivo[];
          return { ...cat, subcategorias: reordered };
        });
        qc.setQueryData<CategoriaDispositivo[]>(queryKey, next);
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

  function handleCategoriaDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !categorias) return;
    const oldIndex = categorias.findIndex((c) => c.id === Number(active.id));
    const newIndex = categorias.findIndex((c) => c.id === Number(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(categorias, oldIndex, newIndex);
    reorderCategorias.mutate(reordered.map((c) => c.id));
  }

  function handleSubcategoriaDragEnd(categoriaId: number, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !categorias) return;
    const cat = categorias.find((c) => c.id === categoriaId);
    if (!cat) return;
    const oldIndex = cat.subcategorias.findIndex((s) => s.id === Number(active.id));
    const newIndex = cat.subcategorias.findIndex((s) => s.id === Number(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(cat.subcategorias, oldIndex, newIndex);
    reorderSubcategorias.mutate({
      categoriaId,
      ids: reordered.map((s) => s.id),
    });
  }

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleConfirmDelete() {
    if (!confirmDel.id || !confirmDel.type) return;
    if (confirmDel.type === "categoria") {
      deleteCategoria.mutate(confirmDel.id);
    } else {
      deleteSubcategoria.mutate(confirmDel.id);
    }
    setConfirmDel({ open: false, type: null, id: null, name: "" });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => setCatDialog({ open: true, editing: null })}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nueva categoría
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : categorias?.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">
          No hay categorías. Crea la primera.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCategoriaDragEnd}
        >
          <SortableContext
            items={categorias?.map((c) => c.id) ?? []}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {categorias?.map((cat) => {
                const expanded = expandedIds.has(cat.id);
                return (
                  <SortableItem key={cat.id} id={cat.id} handleClassName="self-stretch">
                    <Card>
                      <CardContent className="p-0">
                        <div
                          className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 cursor-pointer"
                          onClick={() => toggleExpand(cat.id)}
                        >
                          <div className="flex items-center gap-3">
                            <ChevronRight
                              className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{cat.nombre}</span>
                                {!cat.activo && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    Inactiva
                                  </Badge>
                                )}
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {cat.slug}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {cat.subcategorias.length} subcategoría
                                {cat.subcategorias.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setCatDialog({ open: true, editing: cat })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() =>
                                setConfirmDel({ open: true, type: "categoria", id: cat.id, name: cat.nombre })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {expanded && (
                          <div className="border-t bg-muted/20 px-4 py-3 space-y-2">
                            {cat.subcategorias.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-1">
                                Sin subcategorías
                              </p>
                            ) : (
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={(e) => handleSubcategoriaDragEnd(cat.id, e)}
                              >
                                <SortableContext
                                  items={cat.subcategorias.map((s) => s.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className="space-y-1">
                                    {cat.subcategorias.map((sub) => (
                                      <SortableItem key={sub.id} id={sub.id}>
                                        <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-background">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm">{sub.nombre}</span>
                                            {!sub.activo && (
                                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                Inactiva
                                              </Badge>
                                            )}
                                            <span className="text-[11px] text-muted-foreground font-mono">
                                              {sub.slug}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() =>
                                                setSubDialog({ open: true, categoriaId: cat.id, editing: sub })
                                              }
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-destructive hover:text-destructive"
                                              onClick={() =>
                                                setConfirmDel({ open: true, type: "subcategoria", id: sub.id, name: sub.nombre })
                                              }
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </SortableItem>
                                    ))}
                                  </div>
                                </SortableContext>
                              </DndContext>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setSubDialog({ open: true, categoriaId: cat.id, editing: null })
                              }
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Agregar subcategoría
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <CategoriaDialog
        open={catDialog.open}
        editing={catDialog.editing}
        onOpenChange={(open) => setCatDialog({ open, editing: open ? catDialog.editing : null })}
        onSuccess={invalidate}
      />

      <SubcategoriaDialog
        open={subDialog.open}
        categoriaId={subDialog.categoriaId}
        editing={subDialog.editing}
        onOpenChange={(open) =>
          setSubDialog({ open, categoriaId: open ? subDialog.categoriaId : null, editing: open ? subDialog.editing : null })
        }
        onSuccess={invalidate}
      />

      <ConfirmDialog
        open={confirmDel.open}
        onOpenChange={(open) => !open && setConfirmDel({ open: false, type: null, id: null, name: "" })}
        title={`¿Eliminar ${confirmDel.type === "categoria" ? "categoría" : "subcategoría"}?`}
        description={`Se eliminará "${confirmDel.name}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        loading={deleteCategoria.isPending || deleteSubcategoria.isPending}
      />
    </div>
  );
}

// ─── Dialogs ─────────────────────────────────────────────────────

function CategoriaDialog({
  open, editing, onOpenChange, onSuccess,
}: {
  open: boolean;
  editing: CategoriaDispositivo | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const isEdit = !!editing;
  const form = useForm<CategoriaFormData>({
    resolver: zodResolver(categoriaSchema),
    values: editing
      ? { nombre: editing.nombre, activo: editing.activo }
      : { nombre: "", activo: true },
  });

  const mutation = useMutation({
    mutationFn: (data: CategoriaFormData) => {
      if (isEdit) {
        // Editar: solo lo que el admin puede cambiar.
        // Slug y orden se conservan en el back.
        const payload: CategoriaPayload = {
          nombre: data.nombre,
          activo: data.activo,
        };
        return cotizacionesApi.categorias.update(editing!.id, payload);
      }
      // Crear: solo nombre. El back auto-genera slug, orden y default activo=true.
      const payload: CategoriaPayload = { nombre: data.nombre };
      return cotizacionesApi.categorias.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Categoría actualizada" : "Categoría creada");
      onSuccess();
      onOpenChange(false);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="nombre" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl><Input placeholder="Ej: Celulares/Tablets" {...field} autoFocus /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {isEdit && (
              <FormField control={form.control} name="activo" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Activa</FormLabel>
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

function SubcategoriaDialog({
  open, categoriaId, editing, onOpenChange, onSuccess,
}: {
  open: boolean;
  categoriaId: number | null;
  editing: SubcategoriaDispositivo | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const isEdit = !!editing;
  const form = useForm<SubcategoriaFormData>({
    resolver: zodResolver(subcategoriaSchema),
    values: editing
      ? { nombre: editing.nombre, activo: editing.activo }
      : { nombre: "", activo: true },
  });

  const mutation = useMutation({
    mutationFn: (data: SubcategoriaFormData) => {
      if (isEdit) {
        const payload: Partial<SubcategoriaPayload> = {
          nombre: data.nombre,
          activo: data.activo,
        };
        return cotizacionesApi.subcategorias.update(editing!.id, payload);
      }
      // Crear: solo nombre + categoria padre. Resto lo auto-asigna el back.
      const payload: SubcategoriaPayload = {
        categoria: categoriaId!,
        nombre: data.nombre,
      };
      return cotizacionesApi.subcategorias.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Subcategoría actualizada" : "Subcategoría creada");
      onSuccess();
      onOpenChange(false);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar subcategoría" : "Nueva subcategoría"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="nombre" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl><Input placeholder="Ej: Android" {...field} autoFocus /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {isEdit && (
              <FormField control={form.control} name="activo" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Activa</FormLabel>
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
