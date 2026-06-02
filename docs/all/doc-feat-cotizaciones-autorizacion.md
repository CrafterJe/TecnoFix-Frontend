# feat(cotizaciones): autorización → orden, refacciones automáticas y visor PDF in-app — v1.2.0

## Problema

Una cotización finalizada no tenía forma de "convertirse" en una orden — el flujo
era manual: el técnico abría el módulo de órdenes, escribía cliente y dispositivo
otra vez, agregaba refacciones a mano del inventario y nunca quedaba registrado
qué cotización originó esa orden. Además los PDFs de cotización no abrían en la
app Windows (el `window.open(blobUrl)` queda bloqueado por WebView2).

---

## Solución

### Flujo de autorización (3 pasos)

Cuando el cliente aprueba una cotización en estado `finalizada`, un nuevo wizard
captura los datos faltantes y `POST /cotizaciones/{id}/autorizar/` crea todo en
una sola transacción atómica:

```
[Cotización finalizada]
        ↓
[Dialog 3 pasos]
        ↓
POST /autorizar/
        ↓
┌──────────────────────────────────┐
│ • Vincula/crea Cliente           │
│ • Crea Dispositivo               │
│ • Crea Orden                     │
│ • Auto-crea OrdenRefaccion[]     │
│ • Descuenta stock                │
│ • estado = "autorizada"          │
└──────────────────────────────────┘
        ↓
[Navega a /ordenes/{id}]
```

#### Paso 1 — Dispositivo y problema

| Campo | Comportamiento |
|---|---|
| `tipo` | Inferido del `subcategoria_nombre` del primer item ("iPhone" → celular, "iPad" → tablet, etc.), editable |
| `marca`, `modelo` | Inputs obligatorios |
| `numero_serie` | Opcional |
| `imei` | Opcional. **Solo visible si `tipo === "celular"`** |
| `problema_reportado` | Textarea, mínimo 10 caracteres |
| `detalles_equipo` | **Switch (default ON)** + textarea obligatoria si está activo. Sirve como respaldo al entregar para evitar reclamos |

#### Paso 2 — Cliente y adelanto

Tres modos de cliente (botones tipo tab):

| Modo | Comportamiento |
|---|---|
| **Vincular existente** | Buscador con debounce que llama `clientesApi.list({ search })`; el usuario elige de la lista |
| **Crear nuevo** | Nombre obligatorio + teléfono opcional. Pre-llena el nombre con `cotizacion.nombre_cliente` |
| **Solo nombre** | El backend crea un cliente con `nombre` y `telefono=""`. Útil cuando no quieren dejar contacto |

Tres tipos de adelanto (cards seleccionables):

| Tipo | Comportamiento |
|---|---|
| `ninguno` | Sin adelanto. `monto = null` |
| `personalizado` | Input numérico libre. Convertido a string `.toFixed(2)` antes de enviar |
| `precio_piezas` | Suma calculada de `Σ (precio_base × cantidad)` de todos los items. El backend recalcula y valida con margen ±$0.01 |

#### Paso 3 — Confirmación

Separa items en dos secciones usando una query lazy que fetchea `TipoReparacion[]`
y construye un `Set<number>` con los IDs cuyo `es_servicio === true`:

```tsx
const tiposServicioIds = useMemo(() => {
  if (!tipos) return new Set<number>();
  return new Set(tipos.filter((t) => t.es_servicio).map((t) => t.id));
}, [tipos]);

const itemsPiezas = items.filter((i) => !tiposServicioIds.has(i.tipo_reparacion));
const itemsServicios = items.filter((i) => tiposServicioIds.has(i.tipo_reparacion));
```

- **Piezas** (badge cyan "Afectan inventario") — se descuentan al confirmar
- **Servicios** (badge gris "No afectan inventario") — solo se registran en la orden

---

### Auto-creación de refacciones

El backend recorre `cotizacion.items` y por cada uno:

1. **Si `tipo_reparacion.es_servicio === true`** → ignora
2. **Matching**:
   - Items API → busca `Refaccion` por `(fuente_api, producto_id_externo)`
   - Items manuales → busca por `nombre__iexact`
3. **Si no existe** → crea nueva con `stock = item.cantidad`, `costo = item.precio_base`
4. **Si stock insuficiente** → responde **422 `stock_insuficiente`** con rollback total
5. Descuenta stock y crea `OrdenRefaccion`

El response 200 trae `orden.refacciones_procesadas: Array<{id, nombre, cantidad, creada}>`
que el frontend usa para el toast: *"Orden ORD-xxxx creada · Refacciones: 2 nuevas · 1 actualizada"*.

#### Flag `es_servicio` en `TipoReparacion`

Agregado un campo booleano (default `false`) que se edita desde `TiposTab`:

```tsx
<FormField name="es_servicio" render={({ field }) => (
  <FormItem className="flex items-start gap-3">
    <Switch checked={field.value} onCheckedChange={field.onChange} />
    <div>
      <FormLabel>Es servicio</FormLabel>
      <p className="text-[11px] text-muted-foreground">
        Marca esto si no es una pieza física. Los items con este tipo no
        se agregan al inventario al autorizar la cotización.
      </p>
    </div>
  </FormItem>
)} />
```

En la lista de tipos aparece un badge gris "Servicio" cuando aplica.

---

### Reporte de cancelación

Botón paralelo a "Autorizar" cuando estado = `finalizada`. Llama
`POST /cotizaciones/{id}/reportar-cancelacion/` con una razón estructurada:

| Razón | Notas |
|---|---|
| `cliente_cambio_opinion` | Opcionales |
| `cliente_sin_presupuesto` | Opcionales |
| `no_reparable` | Opcionales |
| `otro` | **Obligatorias** (mínimo 5 caracteres) |

El banner de `EstadoBanner` muestra: *"Esta cotización (COT-xxx) fue cancelada — Razón: Cliente sin presupuesto — Otras notas..."*

---

### Manejo de errores 422

El sidebar interpreta el campo `code` del response y muestra mensajes específicos:

```tsx
if (err?.code === "stock_insuficiente" && err.refacciones_faltantes) {
  const lista = err.refacciones_faltantes
    .map((r) => `${r.refaccion_nombre}: ${r.stock_actual}/${r.stock_requerido}`)
    .join(" · ");
  toast.error("Stock insuficiente para autorizar", {
    description: `Ajusta el stock en inventario antes de reintentar. Faltantes: ${lista}`,
    duration: 12000,
  });
  return;
}

if (err?.code === "adelanto_precio_piezas_mismatch") {
  toast.error("El monto de adelanto no coincide con el costo de piezas", {
    description: `Esperado: ${formatCurrency(err.monto_esperado)} · Recibido: ${formatCurrency(err.monto_recibido)}`,
  });
  return;
}
```

| Código | Cuándo |
|---|---|
| `stock_insuficiente` | Una o más refacciones tienen stock < cantidad pedida |
| `adelanto_precio_piezas_mismatch` | El monto enviado no coincide con `Σ precio_base × cantidad` |
| `adelanto_inconsistente` | `tipo=ninguno` con monto, o viceversa |
| `imei_invalido_para_tipo` | IMEI enviado para dispositivo no celular |
| `detalles_descripcion_requerida` | `tiene_detalles=true` con descripción vacía |

---

### Visor PDF in-app + save dialog nativo

`cotizacionesApi.pdf()` ahora retorna el `Blob` en vez de hacer `window.open()`:

```ts
pdf: async (id, tipo): Promise<Blob> => {
  const response = await apiClient.get(endpoint, { responseType: "blob" });
  return new Blob([response.data], { type: "application/pdf" });
}
```

El sidebar pasa el blob a `PdfPreviewDialog` que renderiza en un `<iframe>` con
parámetros de visor:

```tsx
<iframe
  src={`${url}#view=FitH&toolbar=1&navpanes=0`}
  className="w-full h-full border-0 block"
/>
```

**Truco de flexbox**: para que `h-full` en el iframe funcione, el contenedor flex
necesita `min-h-0` (anula el default `min-height: auto` que impide encoger).

El botón "Descargar" detecta el entorno con `isTauri()`:

#### En Tauri (Windows app)

Imports dinámicos para no cargar los plugins en el bundle web:

```ts
const { save } = await import("@tauri-apps/plugin-dialog");
const { writeFile } = await import("@tauri-apps/plugin-fs");
const { downloadDir } = await import("@tauri-apps/api/path");
const { openPath } = await import("@tauri-apps/plugin-opener");

const dir = await downloadDir();
const filePath = await save({
  title: "Guardar PDF",
  defaultPath: `${dir}/${fileName}`,
  filters: [{ name: "PDF", extensions: ["pdf"] }],
});

if (filePath) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await writeFile(filePath, bytes);
  toast.success("PDF guardado", {
    description: filePath,
    action: { label: "Abrir", onClick: () => openPath(filePath) },
  });
}
```

#### En web

```ts
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = fileName;
a.click();
```

---

## Plugins Tauri agregados

| Plugin | Para qué | Crate Rust | Paquete npm |
|---|---|---|---|
| **Dialog** | Diálogo "Guardar como…" nativo | `tauri-plugin-dialog` | `@tauri-apps/plugin-dialog` |
| **Fs** | Escribir el `Uint8Array` a disco | `tauri-plugin-fs` | `@tauri-apps/plugin-fs` |
| **Opener** | Abrir el archivo guardado con la app default del sistema | `tauri-plugin-opener` | `@tauri-apps/plugin-opener` |

Los 3 lados deben matchear: JS (`package.json`), Rust (`Cargo.toml`), registro
(`src-tauri/src/lib.rs`) y permisos (`capabilities/default.json`):

```json
"permissions": [
  ...,
  "dialog:default", "dialog:allow-save",
  "fs:default", "fs:allow-write-file",
  {
    "identifier": "fs:scope",
    "allow": [
      { "path": "$DOWNLOAD/*" },
      { "path": "$DOCUMENT/*" },
      { "path": "$DESKTOP/*" },
      { "path": "$HOME/*" }
    ]
  },
  "opener:default", "opener:allow-open-path"
]
```

> **Importante**: la primera vez que se corra `npm run tauri dev` después de
> esta versión, Cargo recompila todo (varios minutos). Después queda cacheado.

---

## Fix: lista de órdenes no se actualizaba al eliminar

El `deleteOrdenMutation` original solo navegaba a `/ordenes` sin invalidar la query
de lista, así que la orden eliminada seguía visible. Cuando se agregó
`qc.invalidateQueries({ queryKey: ["ordenes"] })` apareció un 404 fantasma porque
también disparaba el refetch del detalle (con observer aún activo antes del unmount).

**Fix definitivo**:

```ts
onSuccess: () => {
  toast.success("Orden eliminada");
  // refetchType:"none" → marca como stale SIN refetch inmediato.
  // Evita el 404 del detalle aún activo; la lista refetchea al montarse.
  qc.invalidateQueries({ queryKey: ["ordenes"], refetchType: "none" });
  navigate("/ordenes");
}
```

---

## Cambios en `OrdenDetailPage`

| Sección | Cambio |
|---|---|
| Header | Badge "Originada de COT-xxx" (link) cuando `orden.cotizacion != null` |
| Información de la orden | N° serie e IMEI mostrados (si vienen del flujo) |
| Card nueva | "Detalles físicos del equipo" con la descripción o nota "Sin observaciones" |
| Card nueva | "Adelanto del cliente" con tipo + monto |
| Refacciones utilizadas | Lista visible de `OrdenRefaccion` (antes solo se veía el dropdown de agregar). Nota informativa "Refacciones iniciales agregadas automáticamente desde la cotización COT-xxx" cuando aplica |

---

## Tipos clave

### `src/types/cotizaciones.ts`

```typescript
export type EstadoCotizacion = "borrador" | "finalizada" | "autorizada" | "cancelada";

export type RazonCancelacionCotizacion =
  | "cliente_cambio_opinion"
  | "cliente_sin_presupuesto"
  | "no_reparable"
  | "otro";

export type AutorizarErrorCode =
  | "imei_invalido_para_tipo"
  | "detalles_descripcion_requerida"
  | "adelanto_inconsistente"
  | "adelanto_precio_piezas_mismatch"
  | "stock_insuficiente";

export interface AutorizarCotizacionPayload {
  cliente: { modo: "vincular" | "crear" | "nombre_libre"; cliente_id: number | null; nombre: string; telefono: string | null };
  dispositivo: { tipo: TipoDispositivo; marca: string; modelo: string; numero_serie: string | null; imei: string | null };
  problema_reportado: string;
  detalles_equipo: { tiene_detalles: boolean; descripcion: string | null };
  adelanto: { tipo: "ninguno" | "personalizado" | "precio_piezas"; monto: string | null };
}
```

### `src/types/orden.ts`

```typescript
export interface Orden {
  // ...campos base...
  cotizacion?: { id: number; numero_cotizacion: string } | null;
  numero_serie?: string;
  imei?: string;
  detalles_tiene?: boolean;
  detalles_descripcion?: string;
  adelanto_tipo?: "ninguno" | "personalizado" | "precio_piezas";
  adelanto_tipo_display?: string;
  adelanto_monto?: string | null;
  refacciones?: OrdenRefaccion[];
}
```

---

## Archivos modificados / nuevos

| Archivo | Estado | Cambio |
|---|---|---|
| `package.json` / `src-tauri/tauri.conf.json` | M | Versión `1.2.0` |
| `src-tauri/Cargo.toml` / `src/lib.rs` / `capabilities/default.json` | M | Plugins dialog, fs, opener |
| `src/api/cotizaciones.ts` / `src/lib/config.ts` | M | Endpoints `/autorizar/` y `/reportar-cancelacion/`, `pdf()` retorna Blob |
| `src/types/cotizaciones.ts` / `orden.ts` / `inventario.ts` | M | Tipos del flujo, `OrdenRefaccion` extendida, `Refaccion.fuente_api` |
| `src/features/cotizaciones/components/AutorizarCotizacionDialog.tsx` | A | Wizard 3 pasos |
| `src/features/cotizaciones/components/CancelarCotizacionDialog.tsx` | A | Razón estructurada |
| `src/features/cotizaciones/components/PdfPreviewDialog.tsx` | A | Visor in-app + save Tauri |
| `src/features/cotizaciones/components/CotizacionSidebar.tsx` | M | Mutations reales, manejo de errores 422, `PdfPreviewDialog` |
| `src/features/cotizaciones/components/EstadoBanner.tsx` | M | Soporte `autorizada` y `cancelada` con razón |
| `src/features/cotizaciones/components/config/TiposTab.tsx` | M | Switch "Es servicio" + badge |
| `src/features/cotizaciones/CotizacionDetailPage.tsx` / `CotizacionesListPage.tsx` | M | Label/color del nuevo estado |
| `src/features/ordenes/OrdenDetailPage.tsx` | M | Badge cotización, cards detalles + adelanto, lista refacciones, fix delete |
| `docs/backend-docs/cotizaciones-autorizar.md` | A | Spec backend del endpoint principal |
| `docs/backend-docs/cotizaciones-autorizar-refacciones.md` | A | Spec backend de la extensión de refacciones |
| `docs/changelogs/v1.2.0.md` | A | Changelog |
| `docs/PR/pr-cotizaciones-autorizacion-v1.2.0.md` | A | Descripción del PR |
