# feat(cotizaciones): autorización → orden, refacciones automáticas y visor PDF in-app — v1.2.0

## Motivación

Una cotización finalizada no tenía forma de "convertirse" en una orden de servicio
una vez que el cliente la aprobaba — el flujo era manual: crear la orden a mano
en el módulo de órdenes, capturar el cliente otra vez, capturar las refacciones
del inventario, etc. Esta PR cierra el ciclo completo: el cliente aprueba la
cotización, la orden se crea con todos sus datos, las piezas se descuentan del
inventario, y el adelanto del cliente queda registrado para el módulo de ingresos
futuro.

De paso se arregla un bug viejo donde el PDF de la cotización no se abría en la
app Windows (el `window.open(blobUrl)` lo bloquea WebView2). Ahora hay un visor
in-app con un diálogo nativo "Guardar como…" para descargar.

---

## Cambios

### Flujo de autorización (nuevo)

#### `src/features/cotizaciones/components/AutorizarCotizacionDialog.tsx` (nuevo)
- Wizard de 3 pasos: dispositivo y problema, cliente y adelanto, confirmación.
- Paso 1: tipo (inferido del subcategoria_nombre del primer item), marca, modelo, N° serie e IMEI opcionales. IMEI solo visible si tipo = "celular".
- Bloque "Detalles físicos del equipo" con switch (default ON) y textarea obligatoria.
- Paso 2: 3 modos de cliente (vincular existente / crear nuevo / solo nombre). Buscador real al API de clientes con debounce. Sección de adelanto con 3 opciones (ninguno / personalizado / precio_piezas).
- Paso 3: separa items en "Piezas que se procesarán" (afectan inventario) vs "Servicios" (no afectan). Fetchea `TipoReparacion[]` para construir el set de IDs con `es_servicio=true`.
- Validación: bloquea continuar si falta info o adelanto inconsistente. Mantiene `adelanto.monto` como `string` con `.toFixed(2)` para coincidir con el backend.

#### `src/features/cotizaciones/components/CancelarCotizacionDialog.tsx` (nuevo)
- 4 razones estructuradas + notas opcionales (obligatorias si razón = "Otro").

#### `src/features/cotizaciones/components/CotizacionSidebar.tsx`
- Nueva sección "Orden" con botones "Autorizar cotización" (verde) y "Reportar cancelación" cuando estado = `finalizada`.
- Cuando estado = `autorizada`: botón "Ver orden ORD-xxxx" navega a `/ordenes/{id}` real.
- Mutations reales (`cotizacionesApi.autorizar` y `cotizacionesApi.reportarCancelacion`) reemplazan el mock previo.
- Manejo de errores 422 con códigos específicos:
  - `stock_insuficiente` → toast con lista de refacciones faltantes
  - `adelanto_precio_piezas_mismatch` → toast con `monto_esperado` vs `monto_recibido`
  - resto → toast con el `detail` del backend
- Toast de éxito muestra adelanto + cuántas refacciones nuevas/actualizadas.
- Invalida también `["inventario"]` para reflejar el descuento de stock.

#### `src/features/cotizaciones/components/EstadoBanner.tsx`
- Soporta `autorizada` con estilo cyan + link a la orden vinculada.
- Soporta `cancelada` con razón estructurada y notas.

### Refacciones automáticas

#### `src/features/cotizaciones/components/config/TiposTab.tsx`
- Switch "Es servicio" en el dialog de crear/editar tipo de reparación con descripción explicativa.
- Badge gris "Servicio" en cada card de la lista cuando aplica.
- Schema (`zod`) y payload del mutation envían `es_servicio`.

#### `src/features/ordenes/OrdenDetailPage.tsx`
- Badge "Originada de COT-xxx" (link) en header cuando `orden.cotizacion != null`.
- N° serie e IMEI mostrados en la card de dispositivo (si vienen del flujo de autorización).
- Card nueva "Detalles físicos del equipo" con la descripción o nota "Sin observaciones aparentes".
- Card nueva "Adelanto del cliente" con tipo y monto.
- Lista de `OrdenRefaccion` ahora visible: nombre, stock actual, quién la agregó y cantidad. Antes solo se veía el dropdown para agregar manualmente; ahora aparecen las del flujo automático.

### Visor PDF in-app

#### `src/features/cotizaciones/components/PdfPreviewDialog.tsx` (nuevo)
- Modal grande (`max-w-5xl w-[95vw] h-[92vh]`) con visor `<iframe>` (`#view=FitH&toolbar=1&navpanes=0`).
- `min-h-0` en el contenedor flex para que el iframe respete la altura del padre (truco de flexbox).
- Botón "Descargar" detecta el entorno con `isTauri()`:
  - **Tauri**: `import()` dinámico de los plugins → `save()` con default Downloads y filtro `.pdf` → `writeFile()` → toast con botón "Abrir" que llama `openPath()`.
  - **Web**: `<a download>` clásico.

#### `src/api/cotizaciones.ts`
- `pdf()` retorna `Promise<Blob>` en vez de hacer `window.open()` directo. El caller decide.

### Plugins Tauri

#### `src-tauri/Cargo.toml`
- Agregados `tauri-plugin-dialog`, `tauri-plugin-fs`, `tauri-plugin-opener` (todos v2).

#### `src-tauri/src/lib.rs`
- Registro de los 3 plugins en el builder.

#### `src-tauri/capabilities/default.json`
- Permisos `dialog:default`, `dialog:allow-save`, `fs:default`, `fs:allow-write-file`, `opener:default`, `opener:allow-open-path`.
- Scope de filesystem para `$DOWNLOAD/*`, `$DOCUMENT/*`, `$DESKTOP/*`, `$HOME/*`.

### Tipos

#### `src/types/cotizaciones.ts`
- `EstadoCotizacion` agrega `"autorizada"`.
- `RazonCancelacionCotizacion` nuevo type union (4 valores).
- `Cotizacion` extendido con `autorizada_at/by/by_nombre`, `cancelacion_razon/_display/_notas`, `cancelada_at/by/by_nombre`, `orden_vinculada`.
- `TipoReparacion.es_servicio: boolean`.
- `AutorizarCotizacionPayload`, `AutorizarCotizacionResponse`, `ReportarCancelacionPayload` para el API client.
- `AutorizarErrorCode` y `AutorizarErrorResponse` para los 5 códigos 422 documentados.
- `RefaccionProcesada` y `RefaccionFaltante`.

#### `src/types/orden.ts`
- `Orden` agrega `cotizacion`, `numero_serie`, `imei`, `detalles_tiene/_descripcion`, `adelanto_tipo/_display/_monto`, `refacciones: OrdenRefaccion[]`.
- `OrdenRefaccion` agrega atajos `refaccion_id`, `refaccion_nombre`, `added_by_nombre` y `created_at`.

#### `src/types/inventario.ts`
- `Refaccion` agrega `fuente_api`, `producto_id_externo`, `bajo_stock`, `compatibilidades`, `created_at`, `updated_at` (todos opcionales).

### Bug fixes

#### `src/features/ordenes/OrdenDetailPage.tsx`
- `deleteOrdenMutation` ahora invalida `["ordenes"]` con `refetchType: "none"` para evitar:
  - Que la lista quede stale después de eliminar (no se refrescaba al volver).
  - Un GET 404 fantasma al detalle eliminado (el `useQuery` aún tenía observer activo y refetcheaba antes del navigate).

### Documentación

#### `docs/backend-docs/cotizaciones-autorizar.md` (nuevo)
- Spec completa del endpoint `POST /cotizaciones/{id}/autorizar/` y `POST /reportar-cancelacion/`.
- Modelos, migraciones, payloads, errores 422, auditoría, casos límite, tests sugeridos.

#### `docs/backend-docs/cotizaciones-autorizar-refacciones.md` (nuevo)
- Extensión que documenta la auto-creación de refacciones dentro del mismo endpoint.
- Reglas de matching, validaciones de stock, error code `stock_insuficiente`.

---

## Plan de prueba

- [ ] **Flujo happy path**:
  - Crear cotización, agregarle items mixtos (piezas + servicios), finalizarla.
  - Click "Autorizar cotización" → paso 1 captura dispositivo + problema + detalles físicos.
  - Paso 2 elige modo de cliente (probar los 3) y adelanto (probar los 3 tipos).
  - Paso 3 confirma que las piezas y servicios aparecen separados.
  - Verificar toast con "Refacciones: N nuevas · M actualizadas" y navegación a `/ordenes/{id}`.
- [ ] **Verificar orden creada**:
  - Badge "Originada de COT-xxx" visible.
  - N° serie e IMEI mostrados (si se llenaron).
  - Card "Detalles físicos" muestra la descripción.
  - Card "Adelanto" con tipo y monto.
  - Lista de refacciones visible con stock actual y cantidad usada.
- [ ] **Cancelación**:
  - Click "Reportar cancelación" → elegir razón "Otro" sin notas → debe bloquear.
  - Con notas válidas → confirma y banner cambia a rojo con razón.
- [ ] **Stock insuficiente**:
  - Cotización con item que apunte a refacción con stock 1, pero cantidad 3.
  - Autorizar → debe responder 422 y toast detallado, con rollback completo (no se crea orden, cliente ni dispositivo).
- [ ] **Servicios**:
  - Marcar un tipo como "Es servicio" desde admin.
  - Cotizar con ese tipo + una pieza física.
  - Autorizar → en el paso 3 deben aparecer separados; al confirmar, solo la pieza física se descuenta del inventario.
- [ ] **Admin de tipos**:
  - Crear/editar tipo con switch "Es servicio" activo, verificar badge en la lista.
- [ ] **PDF en web**:
  - Click "PDF Cliente" → dialog abre con visor in-app → "Descargar" inicia descarga directa.
- [ ] **PDF en app Windows**:
  - Click "PDF Cliente" → dialog con visor → "Descargar..." abre el diálogo nativo "Guardar como…" con default Downloads.
  - Al guardar → toast "PDF guardado" con botón "Abrir" → debe lanzar el visor PDF del sistema.
- [ ] **Bug: eliminar orden**:
  - Entrar a una orden, eliminarla, volver a la lista → debe estar actualizada sin necesidad de refrescar.
  - Consola sin GET 404 fantasma.
- [ ] **Estado autorizada**:
  - Sidebar muestra "Ver orden ORD-xxxx" (link).
  - Banner cyan con link a la orden.
  - No se pueden agregar/quitar items.

---

## Riesgos y notas

- **Recompilación Tauri**: como se agregaron 3 crates Rust nuevos (`tauri-plugin-dialog`, `tauri-plugin-fs`, `tauri-plugin-opener`), la próxima vez que se corra `npm run tauri dev` o `tauri build` la primera compilación tomará varios minutos. Después queda cacheado.
- **Backend dependency**: requiere los endpoints `/autorizar/` y `/reportar-cancelacion/` ya implementados según las specs en `docs/backend-docs/`. Sin backend, las mutations devuelven 404.
- **Permisos de filesystem**: la app puede escribir en `~/Downloads`, `~/Documents`, `~/Desktop` y `~/`. Cualquier otro path queda bloqueado por el scope.
- **`adelanto.tipo = "precio_piezas"`**: el backend valida con margen ±$0.01. Si el cálculo del frontend difiere (ej. por redondeo), responde 422 con `monto_esperado` y `monto_recibido` para corregir manualmente.

---

## Versión

- `package.json` → `1.2.0`
- `src-tauri/tauri.conf.json` → `1.2.0`

Bump **minor** (`1.1.0` → `1.2.0`): mejoras funcionales aditivas significativas (autorización, refacciones automáticas, visor PDF), pero sin breaking changes en lo que el usuario final ve hoy — todo el código previo sigue funcionando.
