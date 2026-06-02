# Backend Prompt: Auto-creación de refacciones desde cotización autorizada

> **Extensión** del endpoint `POST /cotizaciones/{id}/autorizar/` ya implementado.
> Documento previo: [`cotizaciones-autorizar.md`](./cotizaciones-autorizar.md)

---

## Contexto

Cuando se autoriza una cotización, sus items (que ya describen piezas concretas: Display, Batería, etc.) deben convertirse automáticamente en **refacciones del inventario** vinculadas a la orden recién creada. Esto evita capturar dos veces lo mismo y mantiene el stock actualizado.

**Esta NO es una ruta nueva.** Son pasos adicionales dentro del mismo `transaction.atomic` del endpoint `/autorizar/`.

### Reglas de negocio acordadas

| Decisión | Valor |
|---|---|
| Identificación de refacción existente | Por `fuente_api + producto_id_externo` (items API) o por `nombre` case-insensitive (items manuales) |
| Items "servicio" (mano de obra, liberación, calibración) | Se ignoran — no van a refacciones |
| Stock inicial al crear refacción nueva | `stock = item.cantidad`, luego se descuenta `item.cantidad` → queda en 0 |
| Cuándo se descuenta stock | Al autorizar (en este mismo endpoint) |
| Stock insuficiente en refacción existente | **Bloquear con 422** — el usuario debe ajustar stock manualmente desde inventario antes de autorizar |

---

## 1) Cambios en modelos

### `apps.cotizaciones.models.TipoReparacion`

Agregar campo:

```python
class TipoReparacion(AuditableMixin, ...):
    # ...campos existentes...
    es_servicio = models.BooleanField(
        default=False,
        help_text="True si el tipo representa un servicio (mano de obra, liberación, "
                  "calibración, etc.) y NO una pieza física. Los items con tipo es_servicio=True "
                  "se ignoran al auto-crear refacciones durante la autorización."
    )
```

Default `False` (la mayoría son piezas físicas). El admin marca las excepciones desde `/admin/` o desde la pantalla de configuración del frontend.

### `apps.inventario.models.Refaccion`

Agregar campos opcionales para trazabilidad de origen y matching:

```python
class Refaccion(AuditableMixin, ...):
    # ...campos existentes...
    fuente_api = models.ForeignKey(
        "cotizaciones.FuenteApi",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="refacciones",
    )
    producto_id_externo = models.CharField(max_length=128, blank=True, default="")

    class Meta:
        # ...meta existente...
        constraints = [
            # Una sola refacción por (fuente, id_externo) cuando ambos están presentes.
            # No bloquea refacciones sin fuente_api (que pueden tener nombres duplicados).
            models.UniqueConstraint(
                fields=["fuente_api", "producto_id_externo"],
                condition=Q(fuente_api__isnull=False) & ~Q(producto_id_externo=""),
                name="uniq_refaccion_fuente_producto_externo",
            ),
        ]
```

---

## 2) Migraciones

```bash
python manage.py makemigrations cotizaciones inventario
python manage.py migrate
```

Notas:
- `TipoReparacion.es_servicio` con `default=False` no afecta tipos existentes.
- `Refaccion.fuente_api` y `producto_id_externo` son opcionales — refacciones pre-existentes quedan sin origen API (válido).

---

## 3) Lógica extendida en `POST /autorizar/`

**Dentro del mismo `transaction.atomic` ya documentado en `cotizaciones-autorizar.md` §3.1**, después de crear la orden y ANTES de retornar la respuesta, agregar:

```python
from apps.inventario.models import Refaccion
from apps.ordenes.models import OrdenRefaccion
from apps.cotizaciones.models import ProductoApi

refacciones_faltantes = []
refacciones_creadas_ids = []
ordenrefacciones_creadas_ids = []

for item in cotizacion.items.all().select_related("tipo_reparacion", "fuente_api"):
    # Skip servicios
    if item.tipo_reparacion.es_servicio:
        continue

    refaccion = None
    producto_id_externo_buscar = ""

    # 1) Intentar matching por fuente_api + producto_id_externo (items API)
    if item.fuente_api_id and not item.es_manual:
        # Recuperar producto_id_externo desde el catálogo
        producto = ProductoApi.objects.filter(
            fuente=item.fuente_api,
            titulo=item.producto_titulo,
        ).first()
        if producto:
            producto_id_externo_buscar = producto.producto_id_externo
            refaccion = Refaccion.objects.filter(
                fuente_api=item.fuente_api,
                producto_id_externo=producto.producto_id_externo,
            ).first()

    # 2) Fallback: matching por nombre case-insensitive (items manuales o sin match API)
    if refaccion is None:
        refaccion = Refaccion.objects.filter(
            nombre__iexact=item.producto_titulo.strip(),
        ).first()

    # 3) Si no existe, crear nueva
    if refaccion is None:
        refaccion = Refaccion.objects.create(
            nombre=item.producto_titulo,
            stock=item.cantidad,                     # Stock inicial = cantidad del item
            costo=item.precio_base,                  # Costo base (sin fórmula)
            fuente_api=item.fuente_api,
            producto_id_externo=producto_id_externo_buscar,
            # Resto de campos: default del modelo (descripcion="", etc.)
        )
        refacciones_creadas_ids.append(refaccion.id)

    # 4) Validar stock suficiente (relevante para refacciones pre-existentes)
    if refaccion.stock < item.cantidad:
        refacciones_faltantes.append({
            "refaccion_id": refaccion.id,
            "refaccion_nombre": refaccion.nombre,
            "stock_actual": refaccion.stock,
            "stock_requerido": item.cantidad,
            "cotizacion_item_id": item.id,
        })
        continue  # No descontar ni crear OrdenRefaccion para este item

    # 5) Descontar stock
    refaccion.stock -= item.cantidad
    refaccion.save(update_fields=["stock", "updated_at"])

    # 6) Crear OrdenRefaccion vinculando la pieza a la orden
    or_obj = OrdenRefaccion.objects.create(
        orden=orden,
        refaccion=refaccion,
        cantidad=item.cantidad,
        added_by=request.user,
    )
    ordenrefacciones_creadas_ids.append(or_obj.id)

# Si hubo faltantes, abortar TODA la transacción (incluyendo orden y cliente creados)
if refacciones_faltantes:
    raise ValidationError(
        {
            "code": "stock_insuficiente",
            "detail": "Stock insuficiente para una o más refacciones",
            "refacciones_faltantes": refacciones_faltantes,
        },
        # En el handler de DRF mapear este ValidationError a HTTP 422
    )
```

**Importante:**
- Como esto vive dentro de `transaction.atomic`, si se levanta `ValidationError` por stock insuficiente se hace rollback de TODO: la orden, el cliente, el dispositivo creados quedan revertidos. La cotización vuelve a estar en `finalizada`.
- El frontend ya está preparado para reintentarlo tras que el usuario ajuste el stock.

---

## 4) Nuevo error 422

```json
{
  "detail": "Stock insuficiente para una o más refacciones",
  "code": "stock_insuficiente",
  "refacciones_faltantes": [
    {
      "refaccion_id": 7,
      "refaccion_nombre": "Display iPhone 15 Pro Max",
      "stock_actual": 1,
      "stock_requerido": 3,
      "cotizacion_item_id": 42
    }
  ]
}
```

Agregar al set de códigos 422 existentes del endpoint `/autorizar/`:
- `imei_invalido_para_tipo`
- `detalles_descripcion_requerida`
- `adelanto_inconsistente`
- `adelanto_precio_piezas_mismatch`
- **`stock_insuficiente`** ← NUEVO

---

## 5) Cambios en serializers

### `TipoReparacionSerializer`
Exponer `es_servicio` como read+write (es config del admin):

```python
class Meta:
    fields = [..., "es_servicio"]
```

### `TipoReparacionPayload` (admin write)
Aceptar `es_servicio` opcional con default False.

### `RefaccionSerializer`
Exponer los nuevos campos read-only (los admin no los editan a mano, se asignan al crear desde autorización):

```python
class Meta:
    fields = [..., "fuente_api", "producto_id_externo"]
```

### `OrdenRefaccionSerializer`
Sin cambios — sigue exponiendo `refaccion`, `cantidad`, `added_by` como hoy.

---

## 6) Auditoría

Por cada item procesado (que no sea servicio), registrar en `AuditLog`:

| `action` | `entity` | `entity_id` | `old_value` | `new_value` |
|---|---|---|---|---|
| `CREATE` | `refaccion` | nueva id | `null` | dict completo de la refacción | (solo si se creó) |
| `UPDATE` | `refaccion` | id | `{"stock": X}` | `{"stock": X - cantidad}` | (descuento) |
| `CREATE` | `ordenrefaccion` | nueva id | `null` | dict completo |

El `AuditableMixin` debería cubrir la mayoría automáticamente; validar que los IDs queden ligados correctamente al request del autorizar (mismo `user`, mismo `request_id` si lo manejan).

---

## 7) Tests sugeridos

```python
def test_autorizar_crea_refacciones_nuevas_desde_items_api():
    # Cotización con 2 items API que no existen en inventario.
    # POST /autorizar/ → orden creada, 2 refacciones nuevas con stock=0
    # (creadas con stock=cantidad y descontadas inmediatamente).
    # 2 OrdenRefaccion creadas linkeando orden ↔ refacción.

def test_autorizar_reusa_refaccion_existente_por_fuente_api():
    # Inventario tiene Refaccion con fuente_api=X, producto_id_externo="A1", stock=5.
    # Cotización tiene item con fuente_api=X, producto que en ProductoApi tiene id_externo="A1".
    # POST /autorizar/ → refacción NO se duplica; stock baja a 5 - cantidad.

def test_autorizar_reusa_refaccion_existente_por_nombre_para_items_manuales():
    # Inventario tiene Refaccion con nombre="Cable USB-C", stock=10.
    # Cotización tiene item manual con producto_titulo="cable usb-c" (case-insensitive).
    # POST /autorizar/ → reusa, descuenta del stock.

def test_autorizar_ignora_items_con_tipo_servicio():
    # Cotización tiene 3 items: 2 piezas, 1 servicio (es_servicio=True).
    # POST /autorizar/ → orden tiene 2 OrdenRefaccion, no 3.

def test_autorizar_stock_insuficiente_bloquea_422():
    # Inventario: Display con stock=1. Cotización pide 3.
    # POST /autorizar/ → 422 con code="stock_insuficiente" y refacciones_faltantes[0]
    #   contiene refaccion_id, stock_actual=1, stock_requerido=3.
    # Validar que NI orden NI cliente NI dispositivo quedaron persistidos (rollback).

def test_autorizar_stock_insuficiente_reporta_todos_los_faltantes():
    # 3 items, 2 con stock suficiente, 1 sin stock.
    # Debe reportar el faltante pero NO crear nada (rollback total).
    # refacciones_faltantes tiene 1 elemento.

def test_autorizar_descuenta_stock_atomicamente():
    # Cotización con 2 items que apuntan a la MISMA refacción (cantidad 1 y 2).
    # Refacción tiene stock=3.
    # Validar que se descuenta correctamente 3 → 0 (no race conditions).

def test_autorizar_crea_refaccion_con_stock_igual_a_cantidad():
    # Item nuevo con cantidad=5.
    # Refacción se crea con stock=5, luego se descuenta 5 → stock final=0.

def test_autorizar_costo_de_refaccion_nueva_es_precio_base():
    # Item con precio_base="1500.00", precio_final="3400.00".
    # Refacción nueva debe tener costo=1500.00 (lo que pagamos), no 3400 (lo que cobramos).

def test_tipo_reparacion_es_servicio_default_false():
    # Crear TipoReparacion sin pasar es_servicio.
    # Validar que es_servicio == False.

def test_admin_puede_marcar_tipo_como_servicio():
    # PATCH /tipos-reparacion/{id}/ con es_servicio=true.
    # Validar que se persistió.
```

---

## 8) Criterios de aceptación

- [ ] Migraciones agregan `TipoReparacion.es_servicio` y `Refaccion.fuente_api`/`producto_id_externo` sin pérdida de datos.
- [ ] Unique constraint `(fuente_api, producto_id_externo)` se aplica solo cuando ambos están presentes.
- [ ] `POST /autorizar/` procesa items y crea/reusa refacciones según las reglas de matching.
- [ ] Items con `tipo_reparacion.es_servicio=True` se ignoran.
- [ ] Refacciones nuevas se crean con `stock = item.cantidad`, luego descontadas a `0`.
- [ ] Refacciones existentes con stock suficiente se decrementan correctamente.
- [ ] Stock insuficiente bloquea con 422 `stock_insuficiente` y hace rollback de TODA la transacción.
- [ ] `OrdenRefaccion` se crea linkeando orden ↔ refacción con `added_by=request.user`.
- [ ] Auditoría captura: CREATE de Refaccion (si nueva), UPDATE de stock, CREATE de OrdenRefaccion.
- [ ] Tests cubren happy path + reuso + servicios + stock insuficiente + rollback.
- [ ] El response 200 sigue siendo el mismo (`{cotizacion, orden}`) — opcionalmente puede incluir un campo `refacciones_procesadas: [{id, nombre, cantidad, creada: bool}]` para feedback al frontend.

---

## 9) Impacto en frontend (post-backend)

### `src/types/inventario.ts`
Agregar a `Refaccion`:
```typescript
fuente_api?: { id: number; slug: string; nombre: string } | null;
producto_id_externo?: string;
```

### `src/types/cotizaciones.ts`
- `TipoReparacion`: agregar `es_servicio: boolean`
- `TipoReparacionPayload`: agregar `es_servicio?: boolean`
- `AutorizarErrorCode`: agregar `"stock_insuficiente"`
- Tipo nuevo:
```typescript
export interface RefaccionFaltante {
  refaccion_id: number;
  refaccion_nombre: string;
  stock_actual: number;
  stock_requerido: number;
  cotizacion_item_id: number;
}
export interface AutorizarStockError {
  detail: string;
  code: "stock_insuficiente";
  refacciones_faltantes: RefaccionFaltante[];
}
```

### `src/features/cotizaciones/components/config/TiposTab.tsx`
Agregar checkbox **"Es servicio"** al crear/editar tipo de reparación. Cuando se marca, mostrar badge gris "Servicio" en la lista.

### `src/features/cotizaciones/components/AutorizarCotizacionDialog.tsx` (paso 3)
Mostrar lista de refacciones que se procesarán (filtrando los servicios), con texto "Se descontará del stock al confirmar".

### `src/features/cotizaciones/components/CotizacionSidebar.tsx`
En el `onError` del `autorizarMutation`, manejar el código `stock_insuficiente`:
```typescript
if (err?.code === "stock_insuficiente") {
  const lista = err.refacciones_faltantes
    .map(r => `${r.refaccion_nombre}: ${r.stock_actual}/${r.stock_requerido}`)
    .join(" · ");
  toast.error("Stock insuficiente para autorizar", {
    description: lista,
    duration: 10000,
  });
  return;
}
```

### `src/features/ordenes/OrdenDetailPage.tsx`
En la card "Refacciones utilizadas", marcar visualmente las que vinieron del flujo de autorización (badge pequeño "De cotización"). Esto requiere que `OrdenRefaccionSerializer` exponga algún flag, o que el frontend deduzca por `orden.cotizacion != null`. Sugerencia: agregar `OrdenRefaccion.creada_por_autorizacion: bool` (auto-True cuando se crea en este flujo).

---

## 10) Casos límite y decisiones

| Caso | Comportamiento |
|---|---|
| Cotización con TODOS items de servicio | Orden se crea sin refacciones, sin error |
| Item con cantidad=0 (no debería pasar) | Backend valida, rechaza con 400 |
| Mismo `producto_titulo` en 2 items de la misma cotización | Se reusa la misma Refaccion; el stock se descuenta sumado |
| Refacción ya existe pero con stock negativo (caso edge) | Stock 0 + cantidad >0 → faltante. Reportado en 422 |
| Refacción tiene `fuente_api=null` pero el item sí trae fuente | NO se reusa esa refacción; se busca por nombre como fallback |
| Item manual con nombre que coincide con refacción API | Se reusa esa refacción API (matching por nombre case-insensitive) |
| Eliminar refacción ya vinculada a OrdenRefaccion | Comportamiento actual de la BD (probablemente PROTECT). No cambia |

---

## 11) Notas operativas

- **Performance:** los items se procesan en un loop. Para cotizaciones con muchos items podría ser N+1; considerar `select_related("tipo_reparacion", "fuente_api")` y `prefetch_related` si crece.
- **Concurrencia:** dos autorizaciones simultáneas sobre la misma refacción podrían crear race condition en el `stock -= cantidad`. Usar `Refaccion.objects.select_for_update().filter(id=...)` dentro de la transacción si esto se vuelve un problema en producción.
- **Borrado de cotización autorizada:** ya está cubierto (solo admin, orden queda con `cotizacion=null`). Las refacciones creadas y los descuentos de stock NO se revierten. Esto es intencional: el inventario ya consumió.

---

## Referencias

- Documento del flujo de autorización (base que extiende este): [`cotizaciones-autorizar.md`](./cotizaciones-autorizar.md)
- Documento original del módulo de cotizaciones: [`cotizaciones.md`](./cotizaciones.md)
- Módulo de auditoría: [`../all/auditoria.md`](../all/auditoria.md)
