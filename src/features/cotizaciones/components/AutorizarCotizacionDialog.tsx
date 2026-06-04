import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cotizacionesApi } from "@/api/cotizaciones";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  UserPlus,
  UserCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { clientesApi } from "@/api/clientes";
import { formatCurrency, TIPO_DISPOSITIVO_LABELS } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import type {
  AdelantoTipo,
  AutorizarClienteModo,
  AutorizarCotizacionPayload,
  Cliente,
  Cotizacion,
  TipoDispositivo,
} from "@/types";

export type { AutorizarCotizacionPayload };

interface AutorizarCotizacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotizacion: Cotizacion;
  onAutorizado: (payload: AutorizarCotizacionPayload) => void;
  isPending?: boolean;
}

const TIPOS: TipoDispositivo[] = ["celular", "tablet", "laptop", "computadora", "otro"];

function inferTipoDispositivo(cotizacion: Cotizacion): TipoDispositivo {
  const sub = (cotizacion.items[0]?.subcategoria_nombre ?? "").toLowerCase();
  if (!sub) return "celular";
  if (sub.includes("ipad")) return "tablet";
  if (sub.includes("iphone") || sub.includes("ios") || sub.includes("android")) return "celular";
  if (sub.includes("macbook") || sub.includes("laptop") || sub.includes("notebook")) return "laptop";
  if (sub.includes("imac") || sub.includes("desktop") || sub.includes("pc")) return "computadora";
  if (sub.includes("windows")) return "laptop";
  return "celular";
}

function sumarPreciosBase(cotizacion: Cotizacion): number {
  return cotizacion.items.reduce((acc, item) => {
    const base = Number.parseFloat(item.precio_base) || 0;
    return acc + base * item.cantidad;
  }, 0);
}

interface ClienteFormState {
  modo: AutorizarClienteModo;
  clienteSeleccionado: Cliente | null;
  nombre: string;
  telefono: string;
}

interface DispositivoFormState {
  tipo: TipoDispositivo;
  marca: string;
  modelo: string;
  numero_serie: string;
  imei: string;
}

interface AdelantoFormState {
  tipo: AdelantoTipo;
  montoPersonalizado: string;
}

interface DetallesFormState {
  tieneDetalles: boolean;
  descripcion: string;
}

const STEP_TITLES = [
  "Dispositivo y problema",
  "Cliente y adelanto",
  "Confirmación",
] as const;

export function AutorizarCotizacionDialog({
  open,
  onOpenChange,
  cotizacion,
  onAutorizado,
  isPending = false,
}: AutorizarCotizacionDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [dispositivo, setDispositivo] = useState<DispositivoFormState>(() => ({
    tipo: inferTipoDispositivo(cotizacion),
    marca: "",
    modelo: "",
    numero_serie: "",
    imei: "",
  }));
  const [problema, setProblema] = useState("");
  const [detalles, setDetalles] = useState<DetallesFormState>({
    tieneDetalles: true,
    descripcion: "",
  });
  const [cliente, setCliente] = useState<ClienteFormState>(() => ({
    modo: "crear",
    clienteSeleccionado: null,
    nombre: cotizacion.nombre_cliente ?? "",
    telefono: "",
  }));
  const [clienteSearch, setClienteSearch] = useState("");
  const [adelanto, setAdelanto] = useState<AdelantoFormState>({
    tipo: "ninguno",
    montoPersonalizado: "",
  });

  const precioPiezasTotal = useMemo(() => sumarPreciosBase(cotizacion), [cotizacion]);

  const { data: clientesQuery, isFetching: clientesLoading } = useQuery({
    queryKey: ["clientes", "search", clienteSearch],
    queryFn: () => clientesApi.list({ search: clienteSearch, page_size: 8 }),
    enabled: open && step === 2 && clienteSearch.trim().length >= 2,
  });

  // Para saber qué items son "servicio" (no afectan inventario) en el paso 3
  // de confirmación. Solo se fetchea cuando estamos en paso 3.
  const { data: tipos } = useQuery({
    queryKey: ["cotizaciones", "tipos-reparacion", "all"],
    queryFn: () => cotizacionesApi.tiposReparacion.list(),
    enabled: open && step === 3,
    staleTime: 5 * 60_000,
  });

  const tiposServicioIds = useMemo(() => {
    if (!tipos) return new Set<number>();
    return new Set(tipos.filter((t) => t.es_servicio).map((t) => t.id));
  }, [tipos]);

  const itemsPiezas = useMemo(
    () => cotizacion.items.filter((item) => !tiposServicioIds.has(item.tipo_reparacion)),
    [cotizacion.items, tiposServicioIds],
  );

  const itemsServicios = useMemo(
    () => cotizacion.items.filter((item) => tiposServicioIds.has(item.tipo_reparacion)),
    [cotizacion.items, tiposServicioIds],
  );

  function resetState() {
    setStep(1);
    setDispositivo({
      tipo: inferTipoDispositivo(cotizacion),
      marca: "",
      modelo: "",
      numero_serie: "",
      imei: "",
    });
    setProblema("");
    setDetalles({ tieneDetalles: true, descripcion: "" });
    setCliente({
      modo: "crear",
      clienteSeleccionado: null,
      nombre: cotizacion.nombre_cliente ?? "",
      telefono: "",
    });
    setClienteSearch("");
    setAdelanto({ tipo: "ninguno", montoPersonalizado: "" });
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState();
    onOpenChange(next);
  }

  const detallesValid =
    !detalles.tieneDetalles || detalles.descripcion.trim().length > 0;

  const step1Valid =
    dispositivo.marca.trim().length > 0 &&
    dispositivo.modelo.trim().length > 0 &&
    problema.trim().length >= 10 &&
    detallesValid;

  const step2Valid = (() => {
    if (cliente.modo === "vincular") return cliente.clienteSeleccionado !== null;
    if (cliente.modo === "crear") return cliente.nombre.trim().length > 0;
    if (cliente.modo === "nombre_libre") return cliente.nombre.trim().length > 0;
    return false;
  })();

  const adelantoMonto = (() => {
    if (adelanto.tipo === "ninguno") return null;
    if (adelanto.tipo === "precio_piezas") return precioPiezasTotal;
    const parsed = Number.parseFloat(adelanto.montoPersonalizado);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  })();

  const adelantoValid =
    adelanto.tipo !== "personalizado" || adelantoMonto !== null;

  function handleSubmit() {
    const montoString =
      adelantoMonto !== null ? adelantoMonto.toFixed(2) : null;
    const payload: AutorizarCotizacionPayload = {
      cliente: {
        modo: cliente.modo,
        cliente_id: cliente.modo === "vincular" ? cliente.clienteSeleccionado!.id : null,
        nombre:
          cliente.modo === "vincular"
            ? cliente.clienteSeleccionado!.nombre
            : cliente.nombre.trim(),
        telefono:
          cliente.modo === "vincular"
            ? cliente.clienteSeleccionado!.telefono || null
            : cliente.telefono.trim() || null,
      },
      dispositivo: {
        tipo: dispositivo.tipo,
        marca: dispositivo.marca.trim(),
        modelo: dispositivo.modelo.trim(),
        numero_serie: dispositivo.numero_serie.trim() || null,
        imei: dispositivo.tipo === "celular" ? dispositivo.imei.trim() || null : null,
      },
      problema_reportado: problema.trim(),
      detalles_equipo: {
        tiene_detalles: detalles.tieneDetalles,
        descripcion: detalles.tieneDetalles ? detalles.descripcion.trim() : null,
      },
      adelanto: {
        tipo: adelanto.tipo,
        monto: montoString,
      },
    };
    onAutorizado(payload);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            Autorizar cotización {cotizacion.numero_cotizacion}
          </DialogTitle>
          <DialogDescription>
            Esta cotización pasará a ser una orden de servicio. Los datos quedarán registrados en auditoría.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between gap-2 px-1">
          {STEP_TITLES.map((title, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            const isActive = step === n;
            const isDone = step > n;
            return (
              <div key={title} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors",
                    isActive && "bg-primary text-primary-foreground border-primary",
                    isDone && "bg-green-500/20 text-green-400 border-green-500/40",
                    !isActive && !isDone && "bg-muted text-muted-foreground border-transparent",
                  )}
                >
                  {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
                </div>
                <span
                  className={cn(
                    "text-xs truncate hidden sm:inline",
                    isActive ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  {title}
                </span>
                {i < STEP_TITLES.length - 1 && (
                  <div className="flex-1 h-px bg-border ml-1" />
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        <ScrollArea className="flex-1 min-h-0">
          {/* p-1.5 da aire para que el focus ring de inputs/selects no se recorte
              contra el overflow-hidden del ScrollArea; pr-3 deja hueco al scrollbar */}
          <div className="p-1.5 pr-3">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="autorizar-tipo">Tipo</Label>
                  <Select
                    value={dispositivo.tipo}
                    onValueChange={(v) =>
                      setDispositivo((d) => ({ ...d, tipo: v as TipoDispositivo }))
                    }
                  >
                    <SelectTrigger id="autorizar-tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPO_DISPOSITIVO_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="autorizar-marca">Marca *</Label>
                  <Input
                    id="autorizar-marca"
                    placeholder="Apple"
                    value={dispositivo.marca}
                    onChange={(e) => setDispositivo((d) => ({ ...d, marca: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="autorizar-modelo">Modelo *</Label>
                  <Input
                    id="autorizar-modelo"
                    placeholder="iPhone 14"
                    value={dispositivo.modelo}
                    onChange={(e) => setDispositivo((d) => ({ ...d, modelo: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="autorizar-serie">N° de serie (opcional)</Label>
                  <Input
                    id="autorizar-serie"
                    placeholder="C7XXXXXXXX"
                    value={dispositivo.numero_serie}
                    onChange={(e) =>
                      setDispositivo((d) => ({ ...d, numero_serie: e.target.value }))
                    }
                  />
                </div>
                {dispositivo.tipo === "celular" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="autorizar-imei">IMEI (opcional)</Label>
                    <Input
                      id="autorizar-imei"
                      placeholder="35XXXXXXXXXXXXX"
                      value={dispositivo.imei}
                      onChange={(e) => setDispositivo((d) => ({ ...d, imei: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="autorizar-problema">Problema reportado *</Label>
                <Textarea
                  id="autorizar-problema"
                  placeholder="Describe el problema reportado por el cliente (mínimo 10 caracteres)..."
                  rows={4}
                  value={problema}
                  onChange={(e) => setProblema(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  {problema.trim().length}/10 caracteres mínimo
                </p>
              </div>

              <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autorizar-detalles-switch" className="text-sm">
                      Detalles físicos del equipo
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Rayones, golpes, faltantes — sirve como respaldo al entregar.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={cn(
                        "text-xs",
                        detalles.tieneDetalles
                          ? "text-foreground font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {detalles.tieneDetalles ? "Con detalles" : "Sin detalles"}
                    </span>
                    <Switch
                      id="autorizar-detalles-switch"
                      checked={detalles.tieneDetalles}
                      onCheckedChange={(checked) =>
                        setDetalles((d) => ({ ...d, tieneDetalles: checked }))
                      }
                    />
                  </div>
                </div>

                {detalles.tieneDetalles ? (
                  <Textarea
                    placeholder="Ej: Rayón en la esquina superior derecha, tapa trasera con golpe, sin tornillos inferiores..."
                    rows={3}
                    value={detalles.descripcion}
                    onChange={(e) =>
                      setDetalles((d) => ({ ...d, descripcion: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-[11px] text-muted-foreground italic px-1">
                    El equipo se recibe sin observaciones aparentes.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="text-sm">Cliente</Label>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={cliente.modo === "vincular" ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setCliente((c) => ({ ...c, modo: "vincular" }))}
                    >
                      <UserCheck className="h-3 w-3 mr-1" />
                      Buscar existente
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={cliente.modo === "crear" ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setCliente((c) => ({ ...c, modo: "crear" }))}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Crear nuevo
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={cliente.modo === "nombre_libre" ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setCliente((c) => ({ ...c, modo: "nombre_libre" }))}
                    >
                      Solo nombre
                    </Button>
                  </div>
                </div>

                {cliente.modo === "vincular" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nombre, teléfono o correo (mín. 2 caracteres)..."
                        value={clienteSearch}
                        onChange={(e) => setClienteSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {clienteSearch.trim().length < 2 ? (
                        <p className="text-xs text-muted-foreground p-3 text-center">
                          Escribe al menos 2 caracteres para buscar
                        </p>
                      ) : clientesLoading ? (
                        <div className="p-3 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : !clientesQuery?.results.length ? (
                        <p className="text-xs text-muted-foreground p-3 text-center">
                          Sin resultados. Cambia a "Crear nuevo" para registrar al cliente.
                        </p>
                      ) : (
                        clientesQuery.results.map((c) => {
                          const selected = cliente.clienteSeleccionado?.id === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() =>
                                setCliente((prev) => ({ ...prev, clienteSeleccionado: c }))
                              }
                              className={cn(
                                "w-full text-left p-2.5 hover:bg-muted/60 transition-colors border-b last:border-b-0",
                                selected && "bg-primary/10",
                              )}
                            >
                              <p className="text-sm font-medium">{c.nombre}</p>
                              <p className="text-xs text-muted-foreground">
                                {c.telefono || "Sin teléfono"}
                                {c.email ? ` · ${c.email}` : ""}
                              </p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {cliente.modo === "crear" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="autorizar-cli-nombre">Nombre *</Label>
                      <Input
                        id="autorizar-cli-nombre"
                        value={cliente.nombre}
                        onChange={(e) => setCliente((c) => ({ ...c, nombre: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="autorizar-cli-tel">Teléfono (opcional)</Label>
                      <Input
                        id="autorizar-cli-tel"
                        placeholder="664-XXX-XXXX"
                        value={cliente.telefono}
                        onChange={(e) => setCliente((c) => ({ ...c, telefono: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {cliente.modo === "nombre_libre" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="autorizar-cli-nombre-libre">Nombre del cliente *</Label>
                    <Input
                      id="autorizar-cli-nombre-libre"
                      value={cliente.nombre}
                      onChange={(e) => setCliente((c) => ({ ...c, nombre: e.target.value }))}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      No se creará registro de cliente. Útil cuando el cliente no quiere dejar sus datos.
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Adelanto del cliente (opcional)</Label>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdelanto((a) => ({ ...a, tipo: "ninguno" }))}
                    className={cn(
                      "border rounded-md p-3 text-left transition-colors hover:bg-muted/60",
                      adelanto.tipo === "ninguno" && "border-primary bg-primary/5",
                    )}
                  >
                    <p className="text-sm font-medium">Sin adelanto</p>
                    <p className="text-xs text-muted-foreground">El cliente no dejó nada por adelantado.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdelanto((a) => ({ ...a, tipo: "personalizado" }))}
                    className={cn(
                      "border rounded-md p-3 text-left transition-colors hover:bg-muted/60",
                      adelanto.tipo === "personalizado" && "border-primary bg-primary/5",
                    )}
                  >
                    <p className="text-sm font-medium">Monto personalizado</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Captura el monto exacto que dejó el cliente.
                    </p>
                    {adelanto.tipo === "personalizado" && (
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={adelanto.montoPersonalizado}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setAdelanto((a) => ({ ...a, montoPersonalizado: e.target.value }))
                        }
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdelanto((a) => ({ ...a, tipo: "precio_piezas" }))}
                    className={cn(
                      "border rounded-md p-3 text-left transition-colors hover:bg-muted/60",
                      adelanto.tipo === "precio_piezas" && "border-primary bg-primary/5",
                    )}
                  >
                    <p className="text-sm font-medium flex items-center justify-between">
                      <span>Precio de piezas</span>
                      <span className="tabular-nums">{formatCurrency(precioPiezasTotal)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Suma del costo base de las piezas (sin fórmula) — lo que pagamos por las refacciones.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border rounded-md p-3">
                  <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                  <p className="font-medium">
                    {cliente.modo === "vincular"
                      ? cliente.clienteSeleccionado?.nombre
                      : cliente.nombre.trim()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cliente.modo === "vincular" &&
                      `Cliente existente #${cliente.clienteSeleccionado?.id} · ${cliente.clienteSeleccionado?.telefono || "Sin teléfono"}`}
                    {cliente.modo === "crear" &&
                      `Se creará cliente nuevo · ${cliente.telefono.trim() || "Sin teléfono"}`}
                    {cliente.modo === "nombre_libre" && "Sin registro en clientes"}
                  </p>
                </div>

                <div className="border rounded-md p-3">
                  <p className="text-xs text-muted-foreground mb-1">Dispositivo</p>
                  <p className="font-medium">
                    {TIPO_DISPOSITIVO_LABELS[dispositivo.tipo]} · {dispositivo.marca.trim()} {dispositivo.modelo.trim()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      dispositivo.numero_serie.trim() && `S/N: ${dispositivo.numero_serie.trim()}`,
                      dispositivo.tipo === "celular" && dispositivo.imei.trim() && `IMEI: ${dispositivo.imei.trim()}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sin identificadores"}
                  </p>
                </div>
              </div>

              <div className="border rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">Problema reportado</p>
                <p className="whitespace-pre-wrap text-sm">{problema.trim()}</p>
              </div>

              <div className="border rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Detalles físicos del equipo
                </p>
                {detalles.tieneDetalles ? (
                  <p className="whitespace-pre-wrap text-sm">
                    {detalles.descripcion.trim()}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    Sin observaciones aparentes
                  </p>
                )}
              </div>

              <div className="border rounded-md p-3 space-y-3">
                {/* Piezas: van a inventario */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium">
                      Piezas que se procesarán ({itemsPiezas.length})
                    </p>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                    >
                      Afectan inventario
                    </Badge>
                  </div>
                  {itemsPiezas.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">
                      No hay piezas físicas.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {itemsPiezas.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="truncate pr-2">
                            {item.tipo_reparacion_nombre} · {item.producto_titulo || item.subcategoria_nombre}
                            <span className="text-muted-foreground"> ×{item.cantidad}</span>
                          </span>
                          <span className="tabular-nums font-medium flex-shrink-0">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Se descontarán del stock al confirmar. Las que no estén en inventario se crearán automáticamente.
                  </p>
                </div>

                {/* Servicios: NO van a inventario */}
                {itemsServicios.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium">
                          Servicios ({itemsServicios.length})
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-slate-500/15 text-slate-300 border-slate-500/30"
                        >
                          No afectan inventario
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        {itemsServicios.map((item) => (
                          <div key={item.id} className="flex justify-between text-xs">
                            <span className="truncate pr-2 text-muted-foreground">
                              {item.tipo_reparacion_nombre} · {item.producto_titulo || item.subcategoria_nombre}
                              <span className="text-muted-foreground"> ×{item.cantidad}</span>
                            </span>
                            <span className="tabular-nums flex-shrink-0 text-muted-foreground">
                              {formatCurrency(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total cotización</span>
                  <span className="tabular-nums">{formatCurrency(cotizacion.total)}</span>
                </div>
              </div>

              <div className="border rounded-md p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Adelanto</p>
                  <p className="font-medium">
                    {adelanto.tipo === "ninguno" && "Sin adelanto"}
                    {adelanto.tipo === "personalizado" && "Monto personalizado"}
                    {adelanto.tipo === "precio_piezas" && "Precio de piezas"}
                  </p>
                </div>
                {adelantoMonto !== null && (
                  <Badge variant="outline" className="text-sm tabular-nums">
                    {formatCurrency(adelantoMonto)}
                  </Badge>
                )}
              </div>
            </div>
          )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              disabled={isPending}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Atrás
            </Button>
          )}
          {step < 3 && (
            <Button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={(step === 1 && !step1Valid) || (step === 2 && (!step2Valid || !adelantoValid))}
            >
              Continuar
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Autorizar y crear orden
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
