import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronRight, Search, Loader2, Smartphone, Monitor, Box,
  Wrench, AlertCircle, ArrowLeft, Plus, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cotizacionesApi } from "@/api/cotizaciones";
import { formatCurrency, formatearFormula } from "@/lib/helpers";
import type {
  CategoriaDispositivo, SubcategoriaDispositivo,
  TipoReparacion, ProductoApi, FuenteApi, FuenteApiRef,
  FormulaDisponible,
} from "@/types";

type WizardStep =
  | "global"
  | "categoria"
  | "subcategoria"
  | "fuente"
  | "busqueda"
  | "precio"
  | "tipo"
  | "preview";

interface WizardState {
  step: WizardStep;
  globalSearchQuery: string;
  globalSearchUsed: boolean;
  categoria: CategoriaDispositivo | null;
  subcategoria: SubcategoriaDispositivo | null;
  // Fuente: o es manual, o se seleccionó una FuenteApi (dinámica desde admin)
  esManual: boolean;
  fuenteApi: FuenteApiRef | null;
  productoSeleccionado: ProductoApi | null;
  busquedaQuery: string;
  precioManual: string;
  productoTituloManual: string;
  linkReferencia: string;
  tipoReparacion: TipoReparacion | null;
  // Flujo Manual: toggle "Aplicar fórmula" + ID de fórmula elegida.
  //   aplicarFormula=false (default) → precio_final = precio (sin fórmula).
  //   aplicarFormula=true  → debe elegir una fórmula (formulaSeleccionadaId !== null).
  aplicarFormula: boolean;
  formulaSeleccionadaId: number | null;
  // Solo se usa en API + fórmula personalizada (cuando el backend pide precio manual).
  precioFinalManual: string;
  cantidad: number;
}

const INITIAL: WizardState = {
  step: "global",
  globalSearchQuery: "",
  globalSearchUsed: false,
  categoria: null,
  subcategoria: null,
  esManual: false,
  fuenteApi: null,
  productoSeleccionado: null,
  busquedaQuery: "",
  precioManual: "",
  productoTituloManual: "",
  linkReferencia: "",
  tipoReparacion: null,
  aplicarFormula: false,
  formulaSeleccionadaId: null,
  precioFinalManual: "",
  cantidad: 1,
};

// Helper: encuentra la FormulaDisponible en la lista por id
function findFormula(list: FormulaDisponible[] | undefined, id: number | null): FormulaDisponible | null {
  if (id == null || !list) return null;
  return list.find((f) => f.formula_id === id) ?? null;
}

const CATEGORIA_ICONS: Record<string, React.ReactNode> = {
  celular: <Smartphone className="h-6 w-6" />,
  computadora: <Monitor className="h-6 w-6" />,
};

interface ItemWizardProps {
  cotizacionId: number;
  cotizacionQueryKey: unknown[];
}

export function ItemWizard({ cotizacionId, cotizacionQueryKey }: ItemWizardProps) {
  const qc = useQueryClient();
  const [s, setS] = useState<WizardState>(INITIAL);

  // Debounce global search query (300ms) — no spamear backend
  const [debouncedGlobalQuery, setDebouncedGlobalQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedGlobalQuery(s.globalSearchQuery), 300);
    return () => clearTimeout(t);
  }, [s.globalSearchQuery]);

  function update(partial: Partial<WizardState>) {
    setS((prev) => ({ ...prev, ...partial }));
  }

  // ── Selectors: changing a step resets all downstream state ───────
  function selectFromGlobal(prod: ProductoApi) {
    setS((prev) => ({
      ...INITIAL,
      globalSearchQuery: prev.globalSearchQuery,
      globalSearchUsed: true,
      esManual: false,
      fuenteApi: prod.fuente, // FuenteApiRef ya viene en el producto
      productoSeleccionado: prod,
      step: "categoria",
    }));
  }
  function continuarFlujoManual() {
    setS((prev) => ({
      ...INITIAL,
      globalSearchQuery: prev.globalSearchQuery,
      globalSearchUsed: false,
      step: "categoria",
    }));
  }
  function selectCategoria(cat: CategoriaDispositivo) {
    setS((prev) => ({
      ...INITIAL,
      // Preserve preset desde el buscador global
      globalSearchQuery: prev.globalSearchQuery,
      globalSearchUsed: prev.globalSearchUsed,
      esManual: prev.globalSearchUsed ? prev.esManual : false,
      fuenteApi: prev.globalSearchUsed ? prev.fuenteApi : null,
      productoSeleccionado: prev.globalSearchUsed ? prev.productoSeleccionado : null,
      categoria: cat,
      step: "subcategoria",
    }));
  }
  function selectSubcategoria(sc: SubcategoriaDispositivo) {
    setS((prev) => {
      // Si vino del buscador global, brincar fuente y búsqueda → ir directo a tipo
      if (prev.globalSearchUsed && prev.productoSeleccionado && prev.fuenteApi) {
        return {
          ...prev,
          subcategoria: sc,
          tipoReparacion: null,
          precioFinalManual: "",
          step: "tipo",
        };
      }
      return {
        ...INITIAL,
        globalSearchQuery: prev.globalSearchQuery,
        categoria: prev.categoria,
        subcategoria: sc,
        step: "fuente",
      };
    });
  }
  function selectFuenteApi(fa: FuenteApi) {
    setS((prev) => ({
      ...INITIAL,
      categoria: prev.categoria,
      subcategoria: prev.subcategoria,
      esManual: false,
      fuenteApi: { id: fa.id, slug: fa.slug, nombre: fa.nombre },
      step: "busqueda",
    }));
  }
  function selectFuenteManual() {
    setS((prev) => ({
      ...INITIAL,
      categoria: prev.categoria,
      subcategoria: prev.subcategoria,
      esManual: true,
      fuenteApi: null,
      step: "precio",
    }));
  }
  function selectProducto(prod: ProductoApi) {
    setS((prev) => ({
      ...prev,
      productoSeleccionado: prod,
      tipoReparacion: null,
      precioFinalManual: "",
      step: "tipo",
    }));
  }
  function continuarDesdePrecio() {
    setS((prev) => ({
      ...prev,
      // Reset tipo cuando avanzas desde precio (por si vuelve a editar precio
      // y cambia la fórmula, el tipo debe re-elegirse). El formulaSeleccionadaId
      // y precioFinalManual se conservan ya que el usuario los acaba de elegir.
      tipoReparacion: null,
      step: "tipo",
    }));
  }
  function selectTipo(tipo: TipoReparacion) {
    setS((prev) => ({
      ...prev,
      tipoReparacion: tipo,
      step: "preview",
    }));
  }

  // Step order for back navigation
  const BACK_MAP: Partial<Record<WizardStep, WizardStep>> = {
    categoria: "global",
    subcategoria: "categoria",
    fuente: "subcategoria",
    busqueda: "fuente",
    precio: "fuente",
    tipo: s.globalSearchUsed
      ? "subcategoria"
      : (s.esManual ? "precio" : "busqueda"),
    preview: "tipo",
  };

  function goBack() {
    const prev = BACK_MAP[s.step];
    if (!prev) return;
    if (prev === "global") {
      // Al regresar al buscador global, limpiar preset pero conservar el texto buscado
      setS((cur) => ({
        ...INITIAL,
        globalSearchQuery: cur.globalSearchQuery,
        step: "global",
      }));
      return;
    }
    update({ step: prev });
  }

  // Queries
  const { data: categorias, isLoading: loadingCategorias } = useQuery({
    queryKey: ["cotizaciones", "categorias"],
    queryFn: cotizacionesApi.categorias.list,
    staleTime: 5 * 60_000,
  });

  const { data: tipos, isLoading: loadingTipos } = useQuery({
    queryKey: ["cotizaciones", "tipos", s.categoria?.id],
    queryFn: () => cotizacionesApi.tiposReparacion.list(s.categoria!.id),
    enabled: s.step === "tipo" && !!s.categoria,
    staleTime: 5 * 60_000,
  });

  const precioBaseParaFormula =
    s.esManual
      ? s.precioManual || "0"
      : s.productoSeleccionado?.precio || "0";

  const { data: formulaPreview, isLoading: loadingFormula } = useQuery({
    queryKey: [
      "cotizaciones",
      "formula",
      s.tipoReparacion?.id,
      s.subcategoria?.id,
      precioBaseParaFormula,
    ],
    queryFn: () =>
      cotizacionesApi.resolverFormula({
        tipo_reparacion: s.tipoReparacion!.id,
        subcategoria: s.subcategoria!.id,
        precio_base: precioBaseParaFormula,
      }),
    enabled: s.step === "preview" && !!s.tipoReparacion && !!s.subcategoria,
    staleTime: 0,
  });

  const { data: productosResult, isLoading: loadingProductos } = useQuery({
    queryKey: [
      "cotizaciones",
      "productos",
      s.fuenteApi?.id,
      s.busquedaQuery,
    ],
    queryFn: () =>
      cotizacionesApi.productosApi.list({
        q: s.busquedaQuery || undefined,
        fuente: s.fuenteApi?.id, // backend acepta id o slug
        page_size: 20,
      }),
    enabled: s.step === "busqueda" && !!s.fuenteApi && s.busquedaQuery.length >= 2,
    staleTime: 30_000,
  });

  // Fuentes API dinámicas (para el step "fuente")
  const { data: fuentesApi, isLoading: loadingFuentesApi } = useQuery({
    queryKey: ["cotizaciones", "fuentes-api", "activas"],
    queryFn: () => cotizacionesApi.fuentesApi.list({ activo: true }),
    enabled: s.step === "fuente",
    staleTime: 5 * 60_000,
  });

  // Fórmulas disponibles (deduplicadas) — solo en flujo Manual.
  // Se cargan al entrar al step "precio" (donde está el selector) y siguen
  // disponibles en "tipo" + "preview" gracias al cache.
  const { data: formulasDisponibles, isLoading: loadingFormulasDisponibles } = useQuery({
    queryKey: ["cotizaciones", "formulas", "disponibles"],
    queryFn: () => cotizacionesApi.formulas.disponibles(),
    enabled: s.esManual && ["precio", "tipo", "preview"].includes(s.step),
    staleTime: 5 * 60_000,
  });

  // Fórmulas filtradas: las personalizadas se ocultan del selector — son
  // indistinguibles de "Sin fórmula" para el usuario (toggle OFF cubre ese caso).
  const formulasParaSelector = (formulasDisponibles ?? []).filter(
    (f) => !f.es_personalizado
  );

  // Fórmula efectiva seleccionada (Manual). null = sin fórmula.
  const formulaActiva = findFormula(formulasDisponibles, s.formulaSeleccionadaId);

  // Precio final calculado en vivo según el toggle + fórmula elegida + precio_base.
  const precioFinalCalculado = ((): string | null => {
    if (!s.aplicarFormula || !formulaActiva) {
      // Toggle OFF o ninguna fórmula elegida → precio_final = precio_base
      return precioBaseParaFormula;
    }
    const base = parseFloat(precioBaseParaFormula);
    const mult = parseFloat(formulaActiva.multiplicador ?? "1");
    const incr = parseFloat(formulaActiva.incremento ?? "0");
    if (Number.isNaN(base) || Number.isNaN(mult) || Number.isNaN(incr)) return null;
    return (base * mult + incr).toFixed(2);
  })();

  // Búsqueda global (todas las APIs, sin filtro de fuente)
  const { data: globalResults, isLoading: loadingGlobal } = useQuery({
    queryKey: ["cotizaciones", "productos-global", debouncedGlobalQuery],
    queryFn: () =>
      cotizacionesApi.productosApi.list({
        q: debouncedGlobalQuery,
        page_size: 20,
      }),
    enabled: s.step === "global" && debouncedGlobalQuery.length >= 2,
    staleTime: 30_000,
  });

  const addItem = useMutation({
    mutationFn: () => {
      const titulo =
        s.esManual
          ? (s.productoTituloManual.trim() || s.tipoReparacion!.nombre)
          : s.productoSeleccionado!.titulo;

      const payload: Parameters<typeof cotizacionesApi.items.add>[1] = {
        tipo_reparacion_id: s.tipoReparacion!.id,
        subcategoria_id: s.subcategoria!.id,
        es_manual: s.esManual,
        producto_titulo: titulo,
        precio_base: precioBaseParaFormula,
        cantidad: s.cantidad,
      };

      if (s.esManual) {
        // Manual: formula_id según toggle (OFF → null, ON → id elegida).
        // Nunca se envía precio_final_manual en este flujo simplificado.
        payload.formula_id = s.aplicarFormula ? s.formulaSeleccionadaId : null;
      } else {
        // API: se omite formula_id → backend auto-resuelve.
        // Si la auto-resolución indicó personalizada, mandamos el precio manual.
        if (s.fuenteApi) payload.fuente_api_id = s.fuenteApi.id;
        if (s.productoSeleccionado) payload.disponible = s.productoSeleccionado.disponible;
        if (formulaPreview?.es_personalizado) {
          payload.precio_final_manual = s.precioFinalManual;
        }
      }

      if (s.linkReferencia) {
        payload.link_referencia = s.linkReferencia;
      }

      return cotizacionesApi.items.add(cotizacionId, payload);
    },
    onSuccess: () => {
      toast.success("Item agregado");
      setS(INITIAL);
      qc.invalidateQueries({ queryKey: cotizacionQueryKey });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.detail || "No se pudo agregar el item";
      toast.error(msg);
    },
  });

  // Breadcrumb: solo pasos YA completados (no el actual)
  const breadcrumb = ((): string[] => {
    const items: string[] = [];
    const step = s.step;
    if (step !== "categoria" && s.categoria) {
      items.push(s.categoria.nombre);
    }
    if (!["categoria", "subcategoria"].includes(step) && s.subcategoria) {
      items.push(s.subcategoria.nombre);
    }
    if (!["categoria", "subcategoria", "fuente"].includes(step) && (s.esManual || s.fuenteApi)) {
      items.push(s.esManual ? "Manual" : s.fuenteApi!.nombre);
    }
    if (["tipo", "preview"].includes(step)) {
      const prod = s.productoSeleccionado?.titulo
        ?? (s.esManual ? s.productoTituloManual : null);
      if (prod) items.push(prod);
    }
    if (step === "preview" && s.tipoReparacion) {
      items.push(s.tipoReparacion.nombre);
    }
    return items;
  })();

  // ─── Renders por step ───────────────────────────────────────────

  if (s.step === "global") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#02C5CE]" />
          <StepTitle>Buscador rápido (todas las Páginas)</StepTitle>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Busca un producto en todos los catálogos sincronizados — si lo encuentras, te ahorras los pasos de elegir API.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ej: display iphone 15, batería samsung..."
            value={s.globalSearchQuery}
            onChange={(e) => update({ globalSearchQuery: e.target.value })}
            className="pl-9"
            autoFocus
          />
        </div>

        {s.globalSearchQuery.length < 2 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Escribe al menos 2 caracteres para buscar
          </p>
        ) : loadingGlobal || debouncedGlobalQuery !== s.globalSearchQuery ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="space-y-1">
              {globalResults?.results.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No se encontraron productos en ningún catálogo
                </p>
              ) : (
                globalResults?.results.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => selectFromGlobal(prod)}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-accent/50 text-left transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{prod.titulo}</p>
                      <p className="text-[11px] text-muted-foreground">{prod.vendor}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-semibold tabular-nums">
                        {formatCurrency(prod.precio)}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {prod.fuente.nombre}
                      </Badge>
                      {!prod.disponible && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-400 border-orange-500/30">
                          Sin stock
                        </Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">o</span>
          <Separator className="flex-1" />
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={continuarFlujoManual}
        >
          Continuar al flujo manual
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
  }

  if (s.step === "categoria") {
    return (
      <div className="space-y-4">
        <WizardBreadcrumb path={[]} onBack={goBack} />
        <StepTitle>Selecciona el tipo de dispositivo</StepTitle>
        {loadingCategorias ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categorias?.filter((c) => c.activo).map((cat) => {
              const sinSubcats = cat.subcategorias.filter((s) => s.activo).length === 0;
              return (
                <button
                  key={cat.id}
                  disabled={sinSubcats}
                  onClick={() => selectCategoria(cat)}
                  className={`
                    flex flex-col items-center gap-3 p-4 rounded-xl border text-sm font-medium transition-all
                    ${sinSubcats
                      ? "opacity-50 cursor-not-allowed border-border"
                      : "hover:border-primary/60 hover:bg-accent/40 cursor-pointer border-border"
                    }
                  `}
                >
                  <div className="text-muted-foreground">
                    {CATEGORIA_ICONS[cat.slug] ?? <Box className="h-6 w-6" />}
                  </div>
                  <span>{cat.nombre}</span>
                  {sinSubcats && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Próximamente
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (s.step === "subcategoria") {
    const subcats = s.categoria!.subcategorias.filter((sc) => sc.activo);
    return (
      <div className="space-y-4">
        <WizardBreadcrumb path={[s.categoria!.nombre]} onBack={goBack} />
        <StepTitle>Selecciona el sistema operativo / modelo</StepTitle>
        <div className="flex flex-wrap gap-2">
          {subcats.map((sc) => (
            <button
              key={sc.id}
              onClick={() => selectSubcategoria(sc)}
              className="px-4 py-2 rounded-lg border border-border hover:border-primary/60 hover:bg-accent/40 text-sm font-medium transition-all"
            >
              {sc.nombre}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (s.step === "fuente") {
    return (
      <div className="space-y-4">
        <WizardBreadcrumb path={breadcrumb} onBack={goBack} />
        <StepTitle>¿De dónde obtenemos el precio?</StepTitle>
        {loadingFuentesApi ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {fuentesApi?.map((f) => (
              <button
                key={f.id}
                onClick={() => selectFuenteApi(f)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/60 hover:bg-accent/40 transition-all text-left"
              >
                <Wrench className="h-5 w-5 flex-shrink-0 text-blue-400" />
                <div>
                  <p className="text-sm font-medium">{f.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    Catálogo sincronizado de {f.nombre}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </button>
            ))}
            <button
              onClick={selectFuenteManual}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/60 hover:bg-accent/40 transition-all text-left"
            >
              <Wrench className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Manual</p>
                <p className="text-xs text-muted-foreground">
                  Ingresa el precio manualmente
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (s.step === "busqueda") {
    return (
      <div className="space-y-4">
        <WizardBreadcrumb path={breadcrumb} onBack={goBack} />
        <StepTitle>Busca el producto en el catálogo</StepTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ej: display iphone 15, batería samsung..."
            value={s.busquedaQuery}
            onChange={(e) => update({ busquedaQuery: e.target.value })}
            className="pl-9"
            autoFocus
          />
        </div>

        {s.busquedaQuery.length < 2 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Escribe al menos 2 caracteres para buscar
          </p>
        ) : loadingProductos ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="space-y-1">
              {productosResult?.results.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No se encontraron productos
                </p>
              ) : (
                productosResult?.results.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => selectProducto(prod)}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-accent/50 text-left transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{prod.titulo}</p>
                      <p className="text-[11px] text-muted-foreground">{prod.vendor}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-semibold tabular-nums">
                        {formatCurrency(prod.precio)}
                      </span>
                      {!prod.disponible && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-400 border-orange-500/30">
                          Sin stock
                        </Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  }

  if (s.step === "precio") {
    const hayFormulasDisponibles = formulasParaSelector.length > 0;

    function toggleAplicarFormula(value: boolean) {
      if (value) {
        // ON: pre-seleccionar primera fórmula disponible (si hay)
        update({
          aplicarFormula: true,
          formulaSeleccionadaId: formulasParaSelector[0]?.formula_id ?? null,
        });
      } else {
        // OFF: limpiar selección
        update({ aplicarFormula: false, formulaSeleccionadaId: null });
      }
    }

    const canContinue =
      !!s.productoTituloManual.trim() &&
      (!s.aplicarFormula || s.formulaSeleccionadaId !== null);

    return (
      <div className="space-y-4">
        <WizardBreadcrumb path={breadcrumb} onBack={goBack} />
        <StepTitle>Datos del producto / servicio</StepTitle>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descripción del producto</label>
            <Input
              placeholder="Ej: Cambio de pantalla iPhone 15 Pro"
              value={s.productoTituloManual}
              onChange={(e) => update({ productoTituloManual: e.target.value })}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {s.aplicarFormula ? "Precio base" : "Precio"}
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={s.precioManual}
              onChange={(e) => update({ precioManual: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Link de referencia <span className="font-normal">(opcional)</span>
            </label>
            <Input
              placeholder="https://proveedor.com/producto"
              value={s.linkReferencia}
              onChange={(e) => update({ linkReferencia: e.target.value })}
            />
          </div>
        </div>

        {/* Toggle "Aplicar fórmula" — solo si hay fórmulas reales disponibles */}
        {(loadingFormulasDisponibles || hayFormulasDisponibles) && (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Aplicar fórmula</p>
              <p className="text-xs text-muted-foreground">
                Calcula el precio final con una fórmula configurada.
              </p>
            </div>
            <Switch
              checked={s.aplicarFormula}
              disabled={loadingFormulasDisponibles || !hayFormulasDisponibles}
              onCheckedChange={toggleAplicarFormula}
            />
          </div>
        )}

        {/* Selector de fórmulas — solo visible cuando toggle ON */}
        {s.aplicarFormula && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Fórmula a aplicar</h4>
            {loadingFormulasDisponibles ? (
              <div className="flex items-center gap-2 text-muted-foreground py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Cargando fórmulas...</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {formulasParaSelector.map((f) => (
                  <FormulaOption
                    key={f.formula_id}
                    checked={s.formulaSeleccionadaId === f.formula_id}
                    onClick={() => update({ formulaSeleccionadaId: f.formula_id })}
                    primary={formatearFormula(f.expresion)}
                    mono
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Vista previa precio final */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
          <span className="text-sm font-medium">Precio final</span>
          <span className="text-base font-bold tabular-nums">
            {precioFinalCalculado != null
              ? formatCurrency(precioFinalCalculado)
              : "—"}
          </span>
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={continuarDesdePrecio}
            disabled={!canContinue}
          >
            Continuar
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  if (s.step === "tipo") {
    return (
      <div className="space-y-4">
        <WizardBreadcrumb path={breadcrumb} onBack={goBack} />
        <StepTitle>¿Qué tipo de reparación es?</StepTitle>
        {loadingTipos ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (() => {
          const tiposActivos = tipos?.filter((t) => t.activo) ?? [];
          if (tiposActivos.length === 0) {
            return (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay tipos de reparación disponibles</p>
              </div>
            );
          }
          return (
            <div className="flex flex-wrap gap-2">
              {tiposActivos.map((tipo) => (
                <button
                  key={tipo.id}
                  onClick={() => selectTipo(tipo)}
                  className="px-4 py-2 rounded-lg border border-border hover:border-primary/60 hover:bg-accent/40 text-sm font-medium transition-all"
                >
                  {tipo.nombre}
                </button>
              ))}
            </div>
          );
        })()}
      </div>
    );
  }

  if (s.step === "preview") {
    // Manual: la fórmula ya se eligió en el step "precio". Aquí solo resumen.
    // API: el backend auto-resuelve via /resolver-formula/. Si dice personalizada,
    // pedimos precio_final_manual aquí mismo.

    const needsManualInputApi = !s.esManual && !!formulaPreview?.es_personalizado;

    const initLoading = s.esManual
      ? false
      : (loadingFormula || !formulaPreview);

    const precioFinalShown: string | null = s.esManual
      ? precioFinalCalculado
      : (formulaPreview?.es_personalizado
          ? (s.precioFinalManual || null)
          : formulaPreview?.precio_final ?? null);

    // Texto a mostrar en la fila "Fórmula" del resumen
    const formulaLabel: string | null = s.esManual
      ? (!s.aplicarFormula || !formulaActiva
          ? "Sin fórmula"
          : formatearFormula(formulaActiva.expresion))
      : (formulaPreview?.tiene_formula
          ? (formulaPreview.es_personalizado ? "Personalizado" : formatearFormula(formulaPreview.expresion))
          : "Sin fórmula");

    const canAdd =
      !addItem.isPending &&
      !initLoading &&
      s.cantidad >= 1 &&
      (!needsManualInputApi || s.precioFinalManual !== "");

    return (
      <div className="space-y-4">
        <WizardBreadcrumb path={breadcrumb} onBack={goBack} />
        <StepTitle>Resumen del item</StepTitle>

        {/* Datos estáticos */}
        <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border">
          <InfoRow label="Tipo" value={s.tipoReparacion!.nombre} />
          <InfoRow label="Subcategoría" value={s.subcategoria!.nombre} />
          <InfoRow
            label="Fuente"
            value={s.esManual ? "Manual" : (s.fuenteApi?.nombre ?? "—")}
          />
          {s.productoSeleccionado ? (
            <InfoRow label="Producto" value={s.productoSeleccionado.titulo} />
          ) : s.esManual && s.productoTituloManual ? (
            <InfoRow label="Producto" value={s.productoTituloManual} />
          ) : null}
          <InfoRow
            label="Precio base"
            value={formatCurrency(precioBaseParaFormula)}
          />
          {formulaLabel && (
            <InfoRow
              label="Fórmula"
              value={formulaLabel}
              mono={formulaLabel !== "Sin fórmula" && formulaLabel !== "Personalizado"}
            />
          )}
        </div>

        {/* Input manual SOLO en API + personalizada (en Manual ya se llenó en precio) */}
        {needsManualInputApi && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Precio final (personalizado)
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={s.precioFinalManual}
              onChange={(e) => update({ precioFinalManual: e.target.value })}
              autoFocus
            />
          </div>
        )}

        {/* Vista previa de precio final */}
        {!initLoading && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
            <span className="text-sm font-medium">Precio final</span>
            <span className="text-lg font-bold tabular-nums">
              {precioFinalShown != null ? formatCurrency(precioFinalShown) : "—"}
            </span>
          </div>
        )}

        {/* Cantidad */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Cantidad</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => update({ cantidad: Math.max(1, s.cantidad - 1) })}
              disabled={s.cantidad <= 1}
            >
              −
            </Button>
            <span className="w-8 text-center text-sm font-semibold tabular-nums">
              {s.cantidad}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => update({ cantidad: s.cantidad + 1 })}
            >
              +
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Atrás
          </Button>
          <Button
            size="sm"
            onClick={() => addItem.mutate()}
            disabled={!canAdd}
          >
            {addItem.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Agregar a cotización
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Sub-components ──────────────────────────────────────────────

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-sm">{children}</h3>;
}

function WizardBreadcrumb({
  path,
  onBack,
}: {
  path: string[];
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <button
        onClick={onBack}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Atrás
      </button>
      {path.length > 0 && (
        <>
          <Separator orientation="vertical" className="h-3 mx-1" />
          {path.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span className={i === path.length - 1 ? "text-foreground font-medium" : ""}>
                {item}
              </span>
            </span>
          ))}
        </>
      )}
    </div>
  );
}

function FormulaOption({
  checked,
  onClick,
  primary,
  secondary,
  mono,
}: {
  checked: boolean;
  onClick: () => void;
  primary: string;
  secondary?: string;
  mono?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all
        ${checked
          ? "border-primary/60 bg-primary/5"
          : "border-border hover:border-primary/30 hover:bg-accent/30"
        }
      `}
    >
      <span
        className={`
          h-4 w-4 rounded-full border flex-shrink-0 flex items-center justify-center
          ${checked ? "border-primary" : "border-muted-foreground/40"}
        `}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{primary}</p>
        {secondary && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{secondary}</p>
        )}
      </div>
    </button>
  );
}

function InfoRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 gap-4">
      <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
      <span
        className={`text-xs text-right truncate ${
          mono ? "font-mono" : ""
        } ${highlight ? "font-bold text-sm text-foreground" : "font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}
