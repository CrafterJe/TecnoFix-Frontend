import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { cotizacionesApi } from "@/api/cotizaciones";
import { clientesApi } from "@/api/clientes";
import { CotizacionSidebar } from "./components/CotizacionSidebar";
import { ItemWizard } from "./components/ItemWizard";
import { EstadoBanner } from "./components/EstadoBanner";

const schema = z.object({
  modo: z.enum(["nuevo", "existente"]),
  nombre_cliente: z.string().optional(),
  cliente_id: z.string().optional(),
  notas: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.modo === "nuevo") {
    if (!data.nombre_cliente || data.nombre_cliente.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mínimo 2 caracteres",
        path: ["nombre_cliente"],
      });
    }
  } else if (data.modo === "existente") {
    if (!data.cliente_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona un cliente",
        path: ["cliente_id"],
      });
    }
  }
});

type FormData = z.infer<typeof schema>;

export function NuevaCotizacionPage() {
  const navigate = useNavigate();
  const [cotizacionId, setCotizacionId] = useState<number | null>(null);
  const [clienteSearch, setClienteSearch] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { modo: "nuevo", nombre_cliente: "", cliente_id: "", notas: "" },
  });

  const modo = form.watch("modo");

  const { data: clientesData } = useQuery({
    queryKey: ["clientes", "search", clienteSearch],
    queryFn: () => clientesApi.list({ search: clienteSearch, page_size: 20 }),
    enabled: modo === "existente",
  });

  const crearCotizacion = useMutation({
    mutationFn: (data: FormData) => {
      const payload =
        data.modo === "existente"
          ? { cliente: Number(data.cliente_id), notas: data.notas || undefined }
          : { nombre_cliente: data.nombre_cliente!.trim(), notas: data.notas || undefined };
      return cotizacionesApi.create(payload);
    },
    onSuccess: (cot) => {
      if (!cot?.id || typeof cot.id !== "number") {
        console.error("[NuevaCotizacion] La respuesta del create no incluye un id válido:", cot);
        toast.error("La respuesta del servidor no incluye un ID válido");
        return;
      }
      toast.success(
        cot.numero_cotizacion
          ? `Cotización ${cot.numero_cotizacion} creada`
          : "Cotización creada"
      );
      setCotizacionId(cot.id);
    },
    onError: () => toast.error("No se pudo crear la cotización"),
  });

  const cotizacionQueryKey = ["cotizacion", cotizacionId];
  const { data: cotizacion } = useQuery({
    queryKey: cotizacionQueryKey,
    queryFn: () => cotizacionesApi.get(cotizacionId as number),
    enabled: typeof cotizacionId === "number" && cotizacionId > 0,
    refetchOnWindowFocus: false,
  });

  // ── Step 1: Create quotation form ─────────────────────────────
  if (typeof cotizacionId !== "number") {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="Nueva cotización"
          backTo="/cotizaciones"
          backLabel="Volver a Cotizaciones"
          breadcrumbs={[
            { label: "Cotizaciones", href: "/cotizaciones" },
            { label: "Nueva" },
          ]}
        />

        <div className="max-w-lg">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((d) => crearCotizacion.mutate(d))}
              className="space-y-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Datos del cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="modo"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={field.value === "nuevo" ? "default" : "outline"}
                            onClick={() => {
                              field.onChange("nuevo");
                              form.setValue("cliente_id", "");
                            }}
                          >
                            Cliente nuevo
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={field.value === "existente" ? "default" : "outline"}
                            onClick={() => {
                              field.onChange("existente");
                              form.setValue("nombre_cliente", "");
                            }}
                          >
                            Cliente existente
                          </Button>
                        </div>
                      </FormItem>
                    )}
                  />

                  {modo === "nuevo" ? (
                    <FormField
                      control={form.control}
                      name="nombre_cliente"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del cliente</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Juan Pérez" {...field} autoFocus />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Buscar cliente</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Nombre, teléfono o correo..."
                            value={clienteSearch}
                            onChange={(e) => setClienteSearch(e.target.value)}
                            className="pl-9"
                            autoFocus
                          />
                        </div>
                      </div>
                      <FormField
                        control={form.control}
                        name="cliente_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un cliente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clientesData?.results.length === 0 ? (
                                  <div className="px-3 py-2 text-xs text-muted-foreground">
                                    Sin resultados
                                  </div>
                                ) : (
                                  clientesData?.results.map((c) => (
                                    <SelectItem key={c.id} value={c.id.toString()}>
                                      {c.nombre} — {c.telefono}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="notas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Notas{" "}
                          <span className="text-muted-foreground font-normal">(opcional)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Observaciones, descripción del equipo..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/cotizaciones")}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={crearCotizacion.isPending}>
                  {crearCotizacion.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Crear cotización
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    );
  }

  // ── Step 2: Add items (split layout) ──────────────────────────
  return (
    <div className="flex flex-col lg:h-full">
      <PageHeader
        title="Agregar items"
        description={cotizacion?.numero_cotizacion}
        backTo="/cotizaciones"
        backLabel="Volver a Cotizaciones"
        breadcrumbs={[
          { label: "Cotizaciones", href: "/cotizaciones" },
          { label: "Nueva" },
          { label: "Items" },
        ]}
      />

      <div className="flex flex-col lg:flex-row gap-6 lg:flex-1 lg:min-h-0">
        {/* Left: Item wizard (scroll en lg, flow natural en mobile) */}
        <div className="flex-1 min-w-0 lg:overflow-y-auto lg:pr-2 space-y-4">
          {cotizacion && cotizacion.estado !== "borrador" && (
            <EstadoBanner
              estado={cotizacion.estado}
              numero={cotizacion.numero_cotizacion}
            />
          )}
          {(!cotizacion || cotizacion.estado === "borrador") ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Agregar item a la cotización</CardTitle>
              </CardHeader>
              <CardContent>
                <ItemWizard
                  cotizacionId={cotizacionId}
                  cotizacionQueryKey={cotizacionQueryKey}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Items cotizados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {cotizacion.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Esta cotización no tiene items
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Ver el detalle completo desde el listado.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: full width en mobile, 320px en lg */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <Card className="flex flex-col max-h-[60vh] lg:max-h-none lg:h-full">
            {cotizacion ? (
              <CotizacionSidebar
                cotizacion={cotizacion}
                queryKey={cotizacionQueryKey}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
