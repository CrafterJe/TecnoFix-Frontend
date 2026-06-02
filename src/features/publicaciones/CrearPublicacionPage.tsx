import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { saveBlob } from "@/lib/download";
import { publicacionesApi } from "@/api/publicaciones";
import type { CategoriaPublicacion, DisenoPublicacion } from "@/types";
import { renderDesign } from "./lib/templates";
import { CANVAS } from "./lib/brand";
import { BACKGROUNDS, CATEGORIAS, CATEGORIAS_MAP, sameFondo } from "./schema";

// Construye los valores por defecto de los campos de una categoría.
function defaultFields(category: CategoriaPublicacion): Record<string, string> {
  return Object.fromEntries(CATEGORIAS_MAP[category].campos.map((c) => [c.k, c.val]));
}

export function CrearPublicacionPage() {
  const [category, setCategory] = useState<CategoriaPublicacion>("dato-curioso");
  const [fields, setFields] = useState<Record<string, string>>(() => defaultFields("dato-curioso"));
  const [background, setBackground] = useState(BACKGROUNDS[0].value);
  const [filename, setFilename] = useState("mi-publicacion");

  const campos = CATEGORIAS_MAP[category].campos;

  function handleCategoryChange(next: CategoriaPublicacion) {
    setCategory(next);
    setFields(defaultFields(next));
  }

  // Arma el objeto diseño que viaja al backend / alimenta la vista previa.
  const design = useMemo<DisenoPublicacion>(() => {
    const moneyKeys = new Set(
      CATEGORIAS_MAP[category].campos.filter((c) => c.money).map((c) => c.k),
    );
    const d: DisenoPublicacion = {
      id: filename.trim() || "diseno",
      category,
      background,
    };
    for (const [k, v] of Object.entries(fields)) {
      if (k === "items") {
        d.items = v.split("\n").map((s) => s.trim()).filter(Boolean);
      } else if (moneyKeys.has(k)) {
        // Anteponemos "$" solo si el usuario escribió algo; si está vacío no se muestra.
        const num = v.replace(/\$/g, "").trim();
        if (num) (d as unknown as Record<string, unknown>)[k] = `$${num}`;
      } else if (v !== "") {
        (d as unknown as Record<string, unknown>)[k] = v;
      }
    }
    return d;
  }, [filename, category, background, fields]);

  // El HTML se genera localmente (sin red). Lo diferimos un poco para no
  // recargar las Google Fonts del iframe en cada tecla mientras se escribe.
  const html = useMemo(() => renderDesign(design), [design]);
  const [previewHtml, setPreviewHtml] = useState(html);
  useEffect(() => {
    const t = setTimeout(() => setPreviewHtml(html), 250);
    return () => clearTimeout(t);
  }, [html]);

  // Vista previa responsiva: medimos el contenedor y escalamos el lienzo
  // (1080x1350) para que llene el espacio disponible manteniendo la proporción.
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0);
  useEffect(() => {
    const el = previewAreaRef.current;
    if (!el) return;
    const update = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw <= 0 || ch <= 0) return;
      setPreviewScale(Math.min(cw / CANVAS.width, ch / CANVAS.height));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const previewW = CANVAS.width * previewScale;
  const previewH = CANVAS.height * previewScale;

  const exportar = useMutation({
    mutationFn: () => publicacionesApi.exportarPng(design),
    onSuccess: async (blob) => {
      await saveBlob(blob, `${design.id}.png`, {
        tauriTitle: "Guardar publicación",
        filterName: "PNG",
        extensions: ["png"],
      });
    },
    onError: (e) => {
      console.error("[publicaciones] export PNG failed:", e);
      toast.error("No se pudo generar la imagen");
    },
  });

  return (
    <div className="flex flex-col lg:h-full">
      <PageHeader
        title="Crear publicación"
        description="Genera publicaciones para Facebook / Instagram para TecnoFix (1080 × 1350)"
        className="shrink-0"
      />

      <div className="flex flex-col lg:flex-row gap-6 lg:flex-1 lg:min-h-0">
        {/* ── Formulario (columna angosta, scroll propio en lg) ─────── */}
        <Card className="w-full lg:w-[380px] lg:flex-shrink-0 lg:overflow-y-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contenido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo de publicación */}
            <div className="space-y-1.5">
              <Label>Tipo de publicación</Label>
              <Select value={category} onValueChange={(v) => handleCategoryChange(v as CategoriaPublicacion)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campos dinámicos por categoría */}
            <div className="grid grid-cols-2 gap-3">
              {campos.map((f) => (
                <div
                  key={f.k}
                  className={cn("space-y-1.5", f.half ? "col-span-1" : "col-span-2")}
                >
                  <Label htmlFor={`field-${f.k}`}>{f.label}</Label>
                  {f.type === "area" ? (
                    <Textarea
                      id={`field-${f.k}`}
                      value={fields[f.k] ?? ""}
                      rows={f.k === "items" ? 5 : 3}
                      onChange={(e) => setFields((prev) => ({ ...prev, [f.k]: e.target.value }))}
                    />
                  ) : f.money ? (
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                        $
                      </span>
                      <Input
                        id={`field-${f.k}`}
                        className="pl-7"
                        inputMode="decimal"
                        placeholder={f.placeholder}
                        value={fields[f.k] ?? ""}
                        onChange={(e) => setFields((prev) => ({ ...prev, [f.k]: e.target.value }))}
                      />
                    </div>
                  ) : (
                    <Input
                      id={`field-${f.k}`}
                      placeholder={f.placeholder}
                      value={fields[f.k] ?? ""}
                      onChange={(e) => setFields((prev) => ({ ...prev, [f.k]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Fondo */}
            <div className="space-y-1.5">
              <Label>
                Fondo{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (el logo se ajusta solo: fondo oscuro → blanco, claro → color)
                </span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {BACKGROUNDS.map((b) => {
                  const active = sameFondo(b.value, background);
                  return (
                    <button
                      key={b.name}
                      type="button"
                      disabled={b.disabled}
                      onClick={() => setBackground(b.value)}
                      title={b.disabled ? "Próximamente" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        b.disabled
                          ? "cursor-not-allowed opacity-40 border-input"
                          : active
                            ? "border-accent bg-accent/10 text-foreground"
                            : "border-input hover:bg-accent/5",
                      )}
                    >
                      <span
                        className="h-4 w-4 rounded-sm border border-black/10"
                        style={{ background: b.sw }}
                      />
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nombre del archivo */}
            <div className="space-y-1.5">
              <Label htmlFor="filename">Nombre del archivo</Label>
              <Input
                id="filename"
                value={filename}
                placeholder="mi-publicacion"
                onChange={(e) => setFilename(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Vista previa (llena el espacio restante, escala responsiva) ── */}
        <div className="flex-1 min-w-0 flex flex-col items-center gap-3 lg:min-h-0">
          <div
            ref={previewAreaRef}
            className="w-full flex-1 min-h-[55vh] lg:min-h-0 flex items-center justify-center"
          >
            {previewScale > 0 && (
              <div
                className="relative overflow-hidden rounded-xl shadow-lg bg-muted"
                style={{ width: previewW, height: previewH }}
              >
                <iframe
                  title="Vista previa"
                  srcDoc={previewHtml}
                  className="border-0 origin-top-left"
                  style={{
                    width: CANVAS.width,
                    height: CANVAS.height,
                    transform: `scale(${previewScale})`,
                  }}
                />
              </div>
            )}
          </div>

          <div className="w-full flex flex-col items-center gap-2 shrink-0" style={{ maxWidth: previewW || undefined }}>
            <Button
              className="w-full"
              onClick={() => exportar.mutate()}
              disabled={exportar.isPending}
            >
              {exportar.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {exportar.isPending ? "Generando PNG…" : "Descargar PNG"}
            </Button>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ImagePlus className="h-3.5 w-3.5" />
              Se exporta a 2160 × 2700 px (alta calidad)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
