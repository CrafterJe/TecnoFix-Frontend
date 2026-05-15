import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cotizacionesApi } from "@/api/cotizaciones";
import { extractApiError } from "./errorHelper";
import type {
  FormulaReparacion, FormulaPayload,
  TipoReparacion, SubcategoriaDispositivo,
} from "@/types";

const SUBCAT_GENERICA = "generica";

const formulaSchema = z.object({
  tipo_reparacion: z.coerce.number().int().positive("Selecciona un tipo"),
  subcategoria: z.string().min(1),
  es_personalizado: z.boolean().default(false),
  multiplicador: z.string().optional(),
  incremento: z.string().optional(),
  activo: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.es_personalizado) return;
  if (!data.multiplicador) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["multiplicador"] });
  } else if (Number(data.multiplicador) <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe ser mayor a 0", path: ["multiplicador"] });
  }
  if (!data.incremento) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Requerido", path: ["incremento"] });
  }
});

type FormulaFormData = z.infer<typeof formulaSchema>;

interface CellContext {
  tipo: TipoReparacion;
  subcategoria: SubcategoriaDispositivo;
  formula: FormulaReparacion | null;
  isGeneric: boolean; // true if the formula came from the generic fallback
}

export function FormulasTab() {
  const qc = useQueryClient();
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [dialog, setDialog] = useState<{ open: boolean; context: CellContext | null }>({
    open: false,
    context: null,
  });

  const { data: categorias, isLoading: loadingCategorias } = useQuery({
    queryKey: ["cotizaciones", "categorias"],
    queryFn: cotizacionesApi.categorias.list,
    staleTime: 5 * 60_000,
  });

  // Auto-select first category that has subcategorias + tipos
  useEffect(() => {
    if (!categoriaId && categorias && categorias.length > 0) {
      const first = categorias.find(
        (c) => c.activo && c.subcategorias.some((s) => s.activo)
      );
      if (first) setCategoriaId(first.id.toString());
    }
  }, [categorias, categoriaId]);

  const tiposQueryKey = ["cotizaciones", "tipos-matriz", categoriaId];
  const { data: tipos, isLoading: loadingTipos } = useQuery({
    queryKey: tiposQueryKey,
    queryFn: () => cotizacionesApi.tiposReparacion.list(Number(categoriaId)),
    enabled: !!categoriaId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["cotizaciones", "tipos-matriz"] });
    qc.invalidateQueries({ queryKey: ["cotizaciones", "tipos-config"] });
    qc.invalidateQueries({ queryKey: ["cotizaciones", "tipos"] });
    qc.invalidateQueries({ queryKey: ["cotizaciones", "formulas"] });
  };

  const categoriaSeleccionada = useMemo(
    () => categorias?.find((c) => c.id.toString() === categoriaId) ?? null,
    [categorias, categoriaId]
  );

  const subcategoriasActivas = useMemo(
    () => categoriaSeleccionada?.subcategorias.filter((s) => s.activo) ?? [],
    [categoriaSeleccionada]
  );

  // El backend devuelve los tipos ya ordenados por su campo `orden`,
  // no re-ordenamos en el front para respetar la decisión del admin.
  const tiposOrdenados = tipos ?? [];

  function getFormulaForCell(
    tipo: TipoReparacion,
    subcategoriaId: number
  ): { formula: FormulaReparacion | null; isGeneric: boolean } {
    const specific = tipo.formulas.find((f) => f.subcategoria === subcategoriaId);
    if (specific) return { formula: specific, isGeneric: false };
    const generic = tipo.formulas.find((f) => f.subcategoria === null);
    if (generic) return { formula: generic, isGeneric: true };
    return { formula: null, isGeneric: false };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={categoriaId}
          onValueChange={setCategoriaId}
          disabled={loadingCategorias}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categorias?.filter((c) => c.activo).map((c) => (
              <SelectItem key={c.id} value={c.id.toString()}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!categoriaId ? (
        <p className="text-center py-12 text-sm text-muted-foreground">
          Selecciona una categoría para ver sus fórmulas.
        </p>
      ) : loadingTipos ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      ) : subcategoriasActivas.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">
          Esta categoría no tiene subcategorías activas. Agrega subcategorías primero en la pestaña Categorías.
        </p>
      ) : tiposOrdenados.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">
          Esta categoría no tiene tipos de reparación. Agrega tipos en la pestaña Tipos de reparación.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Tipo</TableHead>
                {subcategoriasActivas.map((sc) => (
                  <TableHead key={sc.id} className="text-center">
                    {sc.nombre}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiposOrdenados.map((tipo) => (
                <TableRow key={tipo.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tipo.nombre}</span>
                      {!tipo.activo && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  {subcategoriasActivas.map((sc) => {
                    const { formula, isGeneric } = getFormulaForCell(tipo, sc.id);
                    return (
                      <TableCell key={sc.id} className="p-1 text-center">
                        <FormulaCell
                          formula={formula}
                          isGeneric={isGeneric}
                          onClick={() =>
                            setDialog({
                              open: true,
                              context: { tipo, subcategoria: sc, formula, isGeneric },
                            })
                          }
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <FormulaCellDialog
        open={dialog.open}
        context={dialog.context}
        onOpenChange={(open) => setDialog({ open, context: open ? dialog.context : null })}
        onSuccess={invalidate}
      />
    </div>
  );
}

// ─── Cell Component ───────────────────────────────────────────────

function FormulaCell({
  formula,
  isGeneric,
  onClick,
}: {
  formula: FormulaReparacion | null;
  isGeneric: boolean;
  onClick: () => void;
}) {
  if (!formula) {
    return (
      <button
        onClick={onClick}
        className="w-full h-full min-h-[40px] flex items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-accent/40 rounded transition-colors py-2"
      >
        <Plus className="h-3 w-3" />
        Agregar
      </button>
    );
  }

  if (formula.es_personalizado) {
    return (
      <button
        onClick={onClick}
        className="w-full h-full min-h-[40px] flex items-center justify-center gap-1.5 hover:bg-accent/40 rounded transition-colors py-2 group"
      >
        <Badge
          variant="outline"
          className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 border-orange-500/30"
        >
          Personalizado
        </Badge>
        {isGeneric && <span className="text-[10px] text-muted-foreground" title="Fórmula genérica (aplica a todas las subcategorías)">(g)</span>}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full h-full min-h-[40px] flex items-center justify-center gap-1.5 hover:bg-accent/40 rounded transition-colors py-2"
    >
      <span className="text-xs font-mono">
        precio × {formula.multiplicador} + {formula.incremento}
      </span>
      {isGeneric && <span className="text-[10px] text-muted-foreground" title="Fórmula genérica (aplica a todas las subcategorías)">(g)</span>}
    </button>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────

function FormulaCellDialog({
  open, context, onOpenChange, onSuccess,
}: {
  open: boolean;
  context: CellContext | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const editing = context?.formula ?? null;
  const isEdit = !!editing;

  const form = useForm<FormulaFormData>({
    resolver: zodResolver(formulaSchema),
    values: context
      ? editing
        ? {
            tipo_reparacion: context.tipo.id,
            subcategoria: editing.subcategoria !== null
              ? editing.subcategoria.toString()
              : SUBCAT_GENERICA,
            es_personalizado: editing.es_personalizado,
            multiplicador: editing.multiplicador ?? "",
            incremento: editing.incremento ?? "",
            activo: editing.activo ?? true,
          }
        : {
            tipo_reparacion: context.tipo.id,
            subcategoria: context.subcategoria.id.toString(),
            es_personalizado: false,
            multiplicador: "2",
            incremento: "0",
            activo: true,
          }
      : {
          tipo_reparacion: 0,
          subcategoria: SUBCAT_GENERICA,
          es_personalizado: false,
          multiplicador: "2",
          incremento: "0",
          activo: true,
        },
  });

  const esPersonalizado = form.watch("es_personalizado");

  const mutation = useMutation({
    mutationFn: (data: FormulaFormData) => {
      const payload: FormulaPayload = {
        tipo_reparacion: data.tipo_reparacion,
        subcategoria: data.subcategoria === SUBCAT_GENERICA ? null : Number(data.subcategoria),
        es_personalizado: data.es_personalizado,
        multiplicador: data.es_personalizado ? null : data.multiplicador,
        incremento: data.es_personalizado ? null : data.incremento,
      };
      // activo solo se envía al editar; al crear el back lo deja en true.
      if (isEdit) {
        payload.activo = data.activo;
      }
      return isEdit
        ? cotizacionesApi.formulas.update(editing!.id, payload)
        : cotizacionesApi.formulas.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Fórmula actualizada" : "Fórmula creada");
      onSuccess();
      onOpenChange(false);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => cotizacionesApi.formulas.delete(editing!.id),
    onSuccess: () => {
      toast.success("Fórmula eliminada");
      onSuccess();
      onOpenChange(false);
      setConfirmDel(false);
    },
    onError: () => {
      toast.error("No se pudo eliminar");
      setConfirmDel(false);
    },
  });

  if (!context) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Editar fórmula" : "Nueva fórmula"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {context.tipo.nombre} · {context.subcategoria.nombre}
              {context.isGeneric && (
                <span className="ml-2 text-orange-400">(actualmente usando fórmula genérica)</span>
              )}
            </p>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <FormField control={form.control} name="subcategoria" render={({ field }) => (
                <FormItem>
                  <FormLabel>Aplica a</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SUBCAT_GENERICA}>
                        Genérica (todas las subcategorías)
                      </SelectItem>
                      <SelectItem value={context.subcategoria.id.toString()}>
                        {context.subcategoria.nombre}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    La "genérica" aplica cuando no hay fórmula específica para la subcategoría.
                  </p>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="es_personalizado" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3 space-y-0">
                  <div>
                    <FormLabel className="!mt-0">Personalizada</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Si está activo, el precio se ingresa manualmente al cotizar.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked) {
                          form.setValue("multiplicador", "");
                          form.setValue("incremento", "");
                        } else {
                          if (!form.getValues("multiplicador")) form.setValue("multiplicador", "2");
                          if (!form.getValues("incremento")) form.setValue("incremento", "0");
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              )} />

              {!esPersonalizado && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="multiplicador" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Multiplicador</FormLabel>
                        <FormControl><Input type="number" step="0.01" min="0.01" placeholder="2.00" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="incremento" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incremento</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="400.00" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  {form.watch("multiplicador") && form.watch("incremento") && (
                    <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2 font-mono">
                      precio × {form.watch("multiplicador")} + {form.watch("incremento")}
                    </p>
                  )}
                </>
              )}

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

              <DialogFooter className="gap-2 sm:gap-2">
                {isEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive mr-auto"
                    onClick={() => setConfirmDel(true)}
                    disabled={mutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                )}
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

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="¿Eliminar fórmula?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
