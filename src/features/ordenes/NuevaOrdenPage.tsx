import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
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
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { clientesApi } from "@/api/clientes";
import { ordenesApi } from "@/api/ordenes";
import { TIPO_DISPOSITIVO_LABELS } from "@/lib/helpers";
import type { TipoDispositivo } from "@/types";

const schema = z.object({
  cliente_id: z.string().min(1, "Selecciona un cliente"),
  dispositivo_id: z.string().optional(),
  nuevo_dispositivo: z.boolean().default(false),
  tipo: z.enum(["celular", "tablet", "laptop", "computadora", "otro"]).optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  problema_reportado: z.string().min(10, "Describe el problema (mínimo 10 caracteres)"),
});

type FormData = z.infer<typeof schema>;

const TIPOS: TipoDispositivo[] = ["celular", "tablet", "laptop", "computadora", "otro"];

export function NuevaOrdenPage() {
  const navigate = useNavigate();
  const [clienteSearch, setClienteSearch] = useState("");
  const [crearDispositivo, setCrearDispositivo] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { cliente_id: "", dispositivo_id: "", problema_reportado: "" },
  });

  const clienteId = form.watch("cliente_id");

  const { data: clientes } = useQuery({
    queryKey: ["clientes", "search", clienteSearch],
    queryFn: () => clientesApi.list({ search: clienteSearch, page_size: 20 }),
    enabled: clienteSearch.length >= 2 || true,
  });

  const { data: dispositivos } = useQuery({
    queryKey: ["dispositivos", clienteId],
    queryFn: () => clientesApi.dispositivos.list({ cliente: Number(clienteId) }),
    enabled: !!clienteId,
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      let dispositivoId = data.dispositivo_id ? Number(data.dispositivo_id) : 0;

      if (crearDispositivo && data.tipo && data.marca && data.modelo) {
        const disp = await clientesApi.dispositivos.create({
          cliente: Number(data.cliente_id),
          tipo: data.tipo,
          marca: data.marca,
          modelo: data.modelo,
        });
        dispositivoId = disp.id;
      }

      return ordenesApi.create({
        dispositivo: dispositivoId,
        problema_reportado: data.problema_reportado,
      });
    },
    onSuccess: (orden) => {
      toast.success(`Orden ${orden.numero_orden} creada`);
      navigate(`/ordenes/${orden.id}`);
    },
    onError: () => toast.error("Error al crear la orden"),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Nueva orden de servicio"
        breadcrumbs={[{ label: "Órdenes", href: "/ordenes" }, { label: "Nueva orden" }]}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cliente y dispositivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cliente */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar cliente</label>
                <Input
                  placeholder="Escribe nombre, teléfono o correo..."
                  value={clienteSearch}
                  onChange={(e) => setClienteSearch(e.target.value)}
                />
              </div>

              <FormField
                control={form.control}
                name="cliente_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue("dispositivo_id", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientes?.results.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.nombre} — {c.telefono}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {clienteId && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Dispositivo</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCrearDispositivo((v) => !v)}
                    >
                      {crearDispositivo ? "Seleccionar existente" : "+ Nuevo dispositivo"}
                    </Button>
                  </div>

                  {crearDispositivo ? (
                    <div className="grid grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="tipo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {TIPOS.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {TIPO_DISPOSITIVO_LABELS[t]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="marca"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Marca</FormLabel>
                            <FormControl>
                              <Input placeholder="Apple" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="modelo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Modelo</FormLabel>
                            <FormControl>
                              <Input placeholder="iPhone 14" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name="dispositivo_id"
                      render={({ field }) => (
                        <FormItem>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un dispositivo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {dispositivos?.results.map((d) => (
                                <SelectItem key={d.id} value={d.id.toString()}>
                                  {TIPO_DISPOSITIVO_LABELS[d.tipo]} — {d.marca} {d.modelo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Problema reportado</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="problema_reportado"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Describe el problema que reporta el cliente con detalle..."
                        rows={4}
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
            <Button type="button" variant="outline" onClick={() => navigate("/ordenes")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creando orden..." : "Crear orden"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
