# Backend Prompt: Autorización de Cotización → Orden

> Documento de implementación para extender el módulo de **cotizaciones** y **órdenes** con el flujo de autorización (cliente aprueba) y reporte de cancelación.
>
> El frontend ya implementó la UI completa como mock (cache local de react-query). Este documento describe **exactamente** qué necesita hacer el backend para reemplazar ese mock con llamadas reales.

---

## Contexto y objetivo

Cuando un cliente recibe su cotización (estado `finalizada`) y decide aprobarla, el sistema debe:

1. **Crear una orden de servicio** prellenada con datos de la cotización (problema reportado, dispositivo, cliente, items).
2. **Vincular** esa orden con la cotización origen (relación 1↔1).
3. **Cambiar el estado** de la cotización a `autorizada`.
4. **Registrar opcionalmente un adelanto** del cliente (monto o "precio de piezas").
5. **Auditar** todas las acciones con `quién/cuándo/qué cambió`.

Si por el contrario el cliente se echa para atrás (o no podemos reparar), se debe poder reportar la cancelación con una razón estructurada.

El módulo de "ingresos/finanzas" se construirá más adelante y consumirá estos datos para calcular pérdida/ganancia, por eso es importante que el **adelanto** y el **costo base de piezas** queden persistidos correctamente desde ahora.

---

## Resumen del flujo

```
┌────────────────────────────────────┐
│ Cotización en estado "finalizada"  │
└──────────────┬─────────────────────┘
               │
       ┌───────┴────────┐
       ↓                ↓
[Autorizar]      [Reportar cancelación]
       │                │
       │                ↓
       │      ┌──────────────────────────┐
       │      │ estado = "cancelada"     │
       │      │ + razón + notas          │
       │      │ + auditoría              │
       │      └──────────────────────────┘
       ↓
┌────────────────────────────────┐
│ Vincular/crear Cliente         │
│ Crear Dispositivo              │
│ Crear Orden (FK a cotización)  │
│ Registrar adelanto             │
│ estado = "autorizada"          │
│ + auditoría completa           │
└────────────────────────────────┘
```

---

## 1) Cambios en modelos

### 1.1 `apps.cotizaciones.models.Cotizacion`

**Agregar al campo `estado`** el choice `"autorizada"`:

```python
ESTADO_CHOICES = [
    ("borrador",   "Borrador"),
    ("finalizada", "Finalizada"),
    ("autorizada", "Autorizada"),   # NUEVO
    ("cancelada",  "Cancelada"),
]
```

**Agregar campos nuevos:**

```python
class Cotizacion(AuditableMixin, ...):
    # ...campos existentes...

    # Auditoría de autorización
    autorizada_at = models.DateTimeField(null=True, blank=True)
    autorizada_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="cotizaciones_autorizadas",
    )

    # Cancelación estructurada
    RAZON_CANCELACION_CHOICES = [
        ("cliente_cambio_opinion",  "Cliente cambió de opinión"),
        ("cliente_sin_presupuesto", "Cliente sin presupuesto"),
        ("no_reparable",            "No pudimos reparar"),
        ("otro",                    "Otro"),
    ]
    cancelacion_razon = models.CharField(
        max_length=32,
        choices=RAZON_CANCELACION_CHOICES,
        null=True, blank=True,
    )
    cancelacion_notas = models.TextField(null=True, blank=True)
    cancelada_at = models.DateTimeField(null=True, blank=True)
    cancelada_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="cotizaciones_canceladas",
    )
```

**Reverse relation a Orden** (se obtiene automáticamente desde el FK que se crea en `Orden`, ver §1.2). El serializer debe exponerla como `orden_vinculada`.

---

### 1.2 `apps.ordenes.models.Orden`

**Agregar campos nuevos:**

```python
class Orden(AuditableMixin, ...):
    # ...campos existentes...

    # Vínculo con la cotización origen (one-to-one — una cotización solo
    # se autoriza una vez; si la orden se cancela, la cotización sigue
    # marcada como "autorizada" pero la orden registra su propia cancelación).
    cotizacion = models.OneToOneField(
        "cotizaciones.Cotizacion",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="orden_vinculada",
    )

    # Identificadores físicos del dispositivo (opcionales)
    numero_serie = models.CharField(max_length=64, blank=True, default="")
    imei = models.CharField(max_length=20, blank=True, default="")  # solo aplica si tipo=celular

    # Detalles físicos al recibir el equipo (rayones, golpes, faltantes).
    # Sirve de respaldo al entregar para evitar reclamos.
    # tiene_detalles=True con descripcion vacía es inválido (validar en serializer).
    detalles_tiene = models.BooleanField(default=True)
    detalles_descripcion = models.TextField(blank=True, default="")

    # Adelanto del cliente al momento de autorizar
    ADELANTO_TIPO_CHOICES = [
        ("ninguno",        "Sin adelanto"),
        ("personalizado",  "Monto personalizado"),
        ("precio_piezas",  "Precio de piezas (costo base sin fórmula)"),
    ]
    adelanto_tipo = models.CharField(
        max_length=16,
        choices=ADELANTO_TIPO_CHOICES,
        default="ninguno",
    )
    adelanto_monto = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
    )
```

**Notas de diseño:**
- `cotizacion` es `OneToOneField` con `SET_NULL` — si se elimina la cotización (admin), la orden no se borra pero queda sin origen.
- `numero_serie` e `imei` son `blank=True, default=""` (no `null=True`) siguiendo la convención de `CharField` en Django.
- `adelanto_tipo="ninguno"` por defecto para órdenes creadas directamente desde `NuevaOrdenPage` (sin pasar por autorización).

---

### 1.3 `apps.clientes.models.Cliente` — verificar campo `telefono`

El flujo de autorización permite crear cliente con teléfono opcional. Confirmar que `Cliente.telefono` ya acepta blank (parece que sí, pero validar):

```python
telefono = models.CharField(max_length=20, blank=True, default="")
```

Si el campo era obligatorio antes, **es un cambio breaking** que debe quedar documentado.

---

## 2) Migraciones

```bash
python manage.py makemigrations cotizaciones ordenes
python manage.py migrate
```

**Validar** que la migración:
- Agrega el choice `"autorizada"` sin perder datos existentes.
- Crea la FK `Orden.cotizacion` con `null=True` (no rompe órdenes anteriores).
- Default de `adelanto_tipo="ninguno"` para órdenes pre-existentes.

---

## 3) Endpoints nuevos

Base: `/api/v1/cotizaciones/`

### 3.1 `POST /cotizaciones/{id}/autorizar/`

Autoriza una cotización y crea la orden vinculada de forma atómica.

**Permisos:** cualquier usuario autenticado.

**Precondiciones:**
- La cotización debe existir.
- Estado actual debe ser exactamente `"finalizada"`.
- La cotización debe tener al menos 1 item.

**Request body:**

```json
{
  "cliente": {
    "modo": "vincular" | "crear" | "nombre_libre",
    "cliente_id": 42,
    "nombre": "Rey David Valdez",
    "telefono": "664-123-4567"
  },
  "dispositivo": {
    "tipo": "celular",
    "marca": "Apple",
    "modelo": "iPhone 15 Pro Max",
    "numero_serie": "C7XXXXXXXX",
    "imei": "35XXXXXXXXXXXXX"
  },
  "problema_reportado": "El display no responde al tacto, hay líneas verdes.",
  "detalles_equipo": {
    "tiene_detalles": true,
    "descripcion": "Rayón leve en la esquina superior derecha. Tapa trasera con ligero golpe."
  },
  "adelanto": {
    "tipo": "ninguno" | "personalizado" | "precio_piezas",
    "monto": 1200.00
  }
}
```

**Reglas de validación:**

| Campo | Regla |
|---|---|
| `cliente.modo` | Obligatorio. Uno de: `vincular`, `crear`, `nombre_libre`. |
| `cliente.cliente_id` | Obligatorio si `modo="vincular"`. Debe existir. |
| `cliente.nombre` | Obligatorio si `modo ∈ {crear, nombre_libre}`. Mínimo 2 caracteres. |
| `cliente.telefono` | Opcional siempre. |
| `dispositivo.tipo` | Uno de: `celular`, `tablet`, `laptop`, `computadora`, `otro`. |
| `dispositivo.marca` | Obligatorio. Mínimo 1 caracter. |
| `dispositivo.modelo` | Obligatorio. Mínimo 1 caracter. |
| `dispositivo.numero_serie` | Opcional. |
| `dispositivo.imei` | Opcional. **Rechazar** si `tipo != "celular"`. |
| `problema_reportado` | Obligatorio. Mínimo 10 caracteres. |
| `detalles_equipo.tiene_detalles` | Obligatorio (boolean). Default `true` desde el frontend. |
| `detalles_equipo.descripcion` | Obligatorio si `tiene_detalles=true`. Mínimo 1 caracter no-blanco. Si `tiene_detalles=false`, debe ser `null` o vacío. |
| `adelanto.tipo` | Obligatorio. Uno de los 3 choices. |
| `adelanto.monto` | Obligatorio y `> 0` si `tipo != "ninguno"`. Debe ser `null` o `0` si `tipo="ninguno"`. |

**Lógica de negocio (todo dentro de una `transaction.atomic`):**

1. **Validar precondiciones** (estado=`finalizada`, hay items).
2. **Resolver cliente:**
   - `modo="vincular"`: usar `Cliente.objects.get(id=cliente_id)`.
   - `modo="crear"`: crear nuevo `Cliente(nombre, telefono, email="")`. Si ya existe un cliente con mismo `nombre+telefono` exactos, reusar (idempotencia opcional).
   - `modo="nombre_libre"`: crear `Cliente(nombre, telefono="", email="")` igualmente. *Justificación: el modelo `Dispositivo` requiere `cliente` FK obligatorio. Si en el futuro se decide soportar dispositivos huérfanos, ajustar.*
3. **Crear dispositivo:** `Dispositivo(cliente=cliente, tipo, marca, modelo, numero_serie, imei)`.
   - *Nota: el modelo actual de `Dispositivo` no tiene `numero_serie` ni `imei` — esos campos viven en `Orden` según §1.2.*
4. **Crear orden:**
   ```python
   Orden.objects.create(
       dispositivo=dispositivo,
       problema_reportado=problema_reportado,
       cotizacion=cotizacion,
       numero_serie=dispositivo_payload.numero_serie,
       imei=dispositivo_payload.imei,  # vacío si tipo != celular
       detalles_tiene=detalles_equipo.tiene_detalles,
       detalles_descripcion=detalles_equipo.descripcion or "",
       adelanto_tipo=adelanto.tipo,
       adelanto_monto=adelanto.monto if adelanto.tipo != "ninguno" else None,
       estado="recibido",
       created_by=request.user,
       received_by=request.user,
   )
   ```
5. **Actualizar cotización:** `estado="autorizada"`, `autorizada_at=now()`, `autorizada_by=request.user`.
6. **Snapshot opcional:** si conviene para auditoría, guardar `items_snapshot` como JSON en la orden o en un campo de auditoría (decisión del backend). El frontend ya tiene los items vía la cotización vinculada, así que no es imprescindible.
7. **Auditoría:** ver §5.

**Response 200:**

```json
{
  "cotizacion": { ...Cotizacion serializada con orden_vinculada... },
  "orden": { ...Orden serializada... }
}
```

**Errores esperados:**

| Código | Caso |
|---|---|
| 400 | Validación de campos falla (formato, longitudes, choices inválidos). |
| 409 | La cotización no está en estado `finalizada` (ya autorizada, cancelada o aún borrador). |
| 404 | `cliente_id` no existe (cuando `modo="vincular"`). |
| 422 | `imei` enviado para `tipo != celular`, `adelanto.monto` inconsistente con `adelanto.tipo`, o `detalles_equipo.descripcion` vacío con `tiene_detalles=true`. |

---

### 3.2 `POST /cotizaciones/{id}/reportar-cancelacion/`

Marca una cotización como cancelada con una razón estructurada.

**Permisos:** cualquier usuario autenticado.

**Precondiciones:**
- La cotización debe existir.
- Estado actual debe ser `"finalizada"`. *(Decisión de diseño: las cotizaciones ya `autorizada` no se cancelan desde aquí — esa cancelación vive en la orden vinculada. Las `borrador` se cancelan con el endpoint existente `cambiar-estado`.)*

**Request body:**

```json
{
  "razon": "cliente_cambio_opinion" | "cliente_sin_presupuesto" | "no_reparable" | "otro",
  "notas": "El cliente prefirió comprar uno nuevo."
}
```

**Reglas de validación:**

| Campo | Regla |
|---|---|
| `razon` | Obligatorio. Uno de los 4 choices. |
| `notas` | Opcional, excepto si `razon="otro"` donde es obligatorio (mínimo 5 caracteres). |

**Lógica:**
1. Validar precondiciones.
2. `estado="cancelada"`, `cancelacion_razon=razon`, `cancelacion_notas=notas`, `cancelada_at=now()`, `cancelada_by=request.user`.
3. Auditoría: ver §5.

**Response 200:** la cotización serializada actualizada.

**Errores esperados:**

| Código | Caso |
|---|---|
| 400 | Razón inválida, o `notas` obligatorias y vacías cuando `razon="otro"`. |
| 409 | La cotización no está en estado `finalizada`. |

---

## 4) Cambios en serializers existentes

### 4.1 `CotizacionSerializer`

Agregar al output (read-only):

```python
class CotizacionSerializer(serializers.ModelSerializer):
    orden_vinculada = serializers.SerializerMethodField()
    cancelacion_razon = serializers.CharField(read_only=True)
    cancelacion_notas = serializers.CharField(read_only=True)

    def get_orden_vinculada(self, obj):
        orden = getattr(obj, "orden_vinculada", None)
        if not orden:
            return None
        return {"id": orden.id, "numero_orden": orden.numero_orden}

    class Meta:
        model = Cotizacion
        fields = [..., "orden_vinculada", "cancelacion_razon", "cancelacion_notas"]
```

### 4.2 `OrdenSerializer`

Agregar al output:

```python
class OrdenSerializer(serializers.ModelSerializer):
    cotizacion = serializers.SerializerMethodField()

    def get_cotizacion(self, obj):
        if not obj.cotizacion_id:
            return None
        return {
            "id": obj.cotizacion.id,
            "numero_cotizacion": obj.cotizacion.numero_cotizacion,
        }

    class Meta:
        model = Orden
        fields = [
            ..., "cotizacion", "numero_serie", "imei",
            "detalles_tiene", "detalles_descripcion",
            "adelanto_tipo", "adelanto_monto",
        ]
```

### 4.3 Payloads de entrada

Crear `AutorizarCotizacionSerializer` y `ReportarCancelacionSerializer` con las validaciones de §3.1 y §3.2. Validar la consistencia entre campos en `validate()`.

---

## 5) Auditoría

Usar el `AuditLog` existente (ver `docs/all/auditoria.md`). Los eventos a registrar:

### En autorización exitosa:

| `action` | `entity` | `entity_id` | `old_value` | `new_value` |
|---|---|---|---|---|
| `STATUS_CHANGE` | `cotizacion` | `cotizacion.id` | `{"estado": "finalizada"}` | `{"estado": "autorizada", "orden_id": orden.id, "autorizada_by": user.id}` |
| `CREATE` | `orden` | `orden.id` | `null` | dict completo de la orden |
| `CREATE` | `cliente` | `cliente.id` | `null` | dict del cliente | *(solo si modo=crear/nombre_libre)* |
| `CREATE` | `dispositivo` | `dispositivo.id` | `null` | dict del dispositivo |

### En reporte de cancelación:

| `action` | `entity` | `entity_id` | `old_value` | `new_value` |
|---|---|---|---|---|
| `STATUS_CHANGE` | `cotizacion` | `cotizacion.id` | `{"estado": "finalizada"}` | `{"estado": "cancelada", "razon": "...", "notas": "..."}` |

El `AuditableMixin` ya cubre la mayor parte automáticamente al hacer `save()`. Validar que la metadata extra (`adelanto`, `razon`, etc.) quede capturada en `new_value`.

---

## 6) Permisos

Mismo modelo de permisos que el resto del módulo de cotizaciones:

| Acción | Rol mínimo |
|---|---|
| Autorizar cotización | Cualquier autenticado |
| Reportar cancelación | Cualquier autenticado |
| Ver orden vinculada | Mismas reglas que ver órdenes |
| Eliminar cotización autorizada | Admin (igual que ya estaba) |

> El usuario explícitamente pidió que **cualquiera pueda autorizar** porque la auditoría queda como respaldo de quién hizo qué.

---

## 7) Casos límite y decisiones

### 7.1 Doble autorización
Si la cotización ya está `autorizada`, devolver 409. **No** crear orden duplicada.

### 7.2 Cliente ya existe pero el usuario eligió "crear"
Comportamiento por defecto: crear nuevo aunque haya duplicado (responsabilidad del frontend evitarlo con el buscador del paso 2). Opción más estricta: rechazar con 409 si hay match exacto en `nombre+telefono` y forzar a usar `modo="vincular"`. **Decisión: dejar pasar y crear duplicado.** El admin puede mergear después si hace falta.

### 7.3 Cotización con items "sin stock"
No bloquear. La autorización procede igual; el estado de stock se gestiona desde la orden / refacciones.

### 7.4 Adelanto = "precio_piezas"
El frontend calcula `Σ (precio_base × cantidad)` y manda el monto resultante en `adelanto.monto`. **Backend NO recalcula** — confía en el monto enviado, pero registra el `tipo="precio_piezas"` para trazabilidad. Si quieres ser estricto, el backend puede recalcular y compararlo con el valor enviado, levantando warning si difieren.

### 7.5 Eliminar cotización autorizada
Mantener el comportamiento actual: solo admin. **Pero** si se elimina, la orden queda con `cotizacion=null` (no se borra en cascada). Considerar advertir al admin desde el frontend.

### 7.6 Eliminar orden vinculada
La cotización queda con `estado="autorizada"` pero sin `orden_vinculada`. El banner del frontend tendrá que manejar `orden_vinculada=null` graceful (ya lo hace). Considerar agregar advertencia en el admin de Django.

### 7.7 Re-autorizar tras cancelar la orden
Si la orden se cancela (al nivel de orden), la cotización sigue `autorizada`. **No** se puede volver a autorizar la misma cotización. Si el cliente quiere otra orden, debe crearse una cotización nueva.

---

## 8) Tests sugeridos

```python
# tests/test_autorizar_cotizacion.py

def test_autorizar_cotizacion_happy_path_cliente_nuevo():
    # Cotización finalizada con 2 items.
    # POST /autorizar/ con modo=crear, adelanto=ninguno.
    # Validar: cotización.estado="autorizada", orden creada, cliente creado,
    #         dispositivo creado, audit logs presentes.

def test_autorizar_cliente_existente():
    # modo="vincular", cliente_id válido.
    # Validar que NO se crea un cliente duplicado.

def test_autorizar_con_adelanto_personalizado():
    # adelanto.tipo="personalizado", monto=500.
    # Validar orden.adelanto_monto == 500.

def test_autorizar_con_adelanto_precio_piezas():
    # Cotización con items cuya suma de precio_base × cantidad = 1200.
    # Frontend manda monto=1200.
    # Validar orden.adelanto_tipo="precio_piezas" y monto=1200.

def test_autorizar_estado_invalido_rechaza_409():
    # Cotización en borrador → 409.
    # Cotización ya autorizada → 409.
    # Cotización cancelada → 409.

def test_autorizar_imei_solo_celular():
    # tipo="laptop" + imei="123" → 422.

def test_autorizar_adelanto_inconsistente():
    # tipo="ninguno" + monto=500 → 422.
    # tipo="personalizado" + monto=null → 422.

def test_autorizar_problema_corto():
    # problema_reportado de 5 caracteres → 400.

def test_autorizar_es_atomico():
    # Forzar fallo a mitad (ej. crear orden falla).
    # Validar que NI cliente NI dispositivo quedan persistidos.

def test_reportar_cancelacion_happy_path():
    # POST /reportar-cancelacion/ razon="cliente_cambio_opinion".
    # Validar estado="cancelada", razón guardada, audit log creado.

def test_reportar_cancelacion_otro_requiere_notas():
    # razon="otro" sin notas → 400.
    # razon="otro" + notas de 3 chars → 400.

def test_reportar_cancelacion_estado_invalido():
    # Cotización autorizada o ya cancelada → 409.
```

---

## 9) Criterios de aceptación

- [ ] Migración crea los campos sin pérdida de datos.
- [ ] `POST /cotizaciones/{id}/autorizar/` funciona en happy path con los 3 modos de cliente.
- [ ] La orden creada queda enlazada en ambos sentidos (`Orden.cotizacion_id` y `Cotizacion.orden_vinculada`).
- [ ] Adelanto se persiste correctamente con sus 3 tipos.
- [ ] Numero de serie e IMEI se guardan en la orden (no en el dispositivo).
- [ ] IMEI solo se acepta si `tipo=celular`.
- [ ] Detalles físicos del equipo se persisten en la orden (`detalles_tiene` + `detalles_descripcion`).
- [ ] Rechazo de `tiene_detalles=true` con `descripcion` vacía.
- [ ] Estado `autorizada` se renderiza en el listado y se puede filtrar por él.
- [ ] `POST /cotizaciones/{id}/reportar-cancelacion/` registra razón y notas.
- [ ] La auditoría captura: cambio de estado, creación de orden, creación de cliente (si aplica), creación de dispositivo.
- [ ] Todos los endpoints son atómicos (transaction.atomic).
- [ ] Tests cubren happy path + cada caso de rechazo (400, 409, 422).

---

## 10) Impacto en frontend (post-backend)

Una vez que el backend esté listo, el frontend debe:

### Reemplazar mocks en [`src/features/cotizaciones/components/CotizacionSidebar.tsx`](../../src/features/cotizaciones/components/CotizacionSidebar.tsx)

```typescript
// Reemplazar el setTimeout + setQueryData por:
const autorizarMutation = useMutation({
  mutationFn: (payload: AutorizarCotizacionPayload) =>
    cotizacionesApi.autorizar(cotizacion.id, payload),
  onSuccess: ({ cotizacion: updated, orden }) => {
    qc.setQueryData(queryKey, updated);
    toast.success(`Orden ${orden.numero_orden} creada`);
    setAutorizarOpen(false);
  },
  onError: (e) => toast.error(extractErrorDetail(e)),
});

const cancelarMutation = useMutation({
  mutationFn: (payload: CancelarCotizacionPayload) =>
    cotizacionesApi.reportarCancelacion(cotizacion.id, payload),
  onSuccess: (updated) => {
    qc.setQueryData(queryKey, updated);
    toast.success("Cotización cancelada");
    setCancelarOpen(false);
  },
});
```

### Agregar a [`src/api/cotizaciones.ts`](../../src/api/cotizaciones.ts):

```typescript
autorizar: (id: number, payload: AutorizarCotizacionPayload) =>
  apiClient.post<{ cotizacion: Cotizacion; orden: Orden }>(
    `${ENDPOINTS.cotizaciones.detail(id)}autorizar/`,
    payload,
  ).then((r) => r.data),

reportarCancelacion: (id: number, payload: CancelarCotizacionPayload) =>
  apiClient.post<Cotizacion>(
    `${ENDPOINTS.cotizaciones.detail(id)}reportar-cancelacion/`,
    payload,
  ).then((r) => r.data),
```

### Ajustar [`src/features/ordenes/`](../../src/features/ordenes/)

Cambios opcionales pero recomendados:

- **[`OrdenDetailPage.tsx`](../../src/features/ordenes/OrdenDetailPage.tsx)**:
  - Mostrar badge "Originada de COT-xxxx" con link cuando `orden.cotizacion != null`.
  - Card o sección de **adelanto** con tipo y monto.
  - Mostrar `numero_serie` e `imei` (si existe) junto al dispositivo.
  - Card "Detalles físicos del equipo" con `detalles_descripcion` (o nota "sin observaciones" si `detalles_tiene=false`).
  - Sección read-only "Items cotizados" listando los items de la cotización origen.

- **[`OrdenesPage.tsx`](../../src/features/ordenes/OrdenesPage.tsx)** (lista):
  - Icono pequeño o columna que indique órdenes originadas de cotización.

- **[`NuevaOrdenPage.tsx`](../../src/features/ordenes/NuevaOrdenPage.tsx)**:
  - Sigue válido para crear orden directa.
  - Opcionalmente agregar campos `numero_serie` e `imei` al formulario para paridad.

### Tipos a actualizar [`src/types/orden.ts`](../../src/types/orden.ts)

```typescript
export type AdelantoTipo = "ninguno" | "personalizado" | "precio_piezas";

export interface Orden {
  // ...existentes...
  cotizacion: { id: number; numero_cotizacion: string } | null;
  numero_serie: string;
  imei: string;
  detalles_tiene: boolean;
  detalles_descripcion: string;
  adelanto_tipo: AdelantoTipo;
  adelanto_monto: string | null;
}
```

---

## 11) Futuro: módulo de ingresos

Cuando se construya el módulo de **ingresos/finanzas**, va a consumir:

- `Orden.adelanto_monto` → suma de adelantos recibidos.
- `CotizacionItem.precio_base × cantidad` → costo total de piezas (lo que pagamos).
- `Orden.costo_final` → lo que cobramos al cliente.
- Diferencia → ganancia/pérdida por orden.

Por eso es **crítico** que el `adelanto_tipo="precio_piezas"` quede registrado distintamente de `personalizado`: en el primero el monto refleja costo de piezas, no ganancia.

---

## Referencias

- Documento original del módulo de cotizaciones: [`cotizaciones.md`](./cotizaciones.md)
- **Extensión: auto-creación de refacciones desde items autorizados** → [`cotizaciones-autorizar-refacciones.md`](./cotizaciones-autorizar-refacciones.md)
- Módulo de auditoría: [`../all/auditoria.md`](../all/auditoria.md)
- Frontend mock implementado en: [`../../src/features/cotizaciones/components/AutorizarCotizacionDialog.tsx`](../../src/features/cotizaciones/components/AutorizarCotizacionDialog.tsx) y [`CancelarCotizacionDialog.tsx`](../../src/features/cotizaciones/components/CancelarCotizacionDialog.tsx)
