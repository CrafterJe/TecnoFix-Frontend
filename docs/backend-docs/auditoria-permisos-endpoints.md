# Auditoría de permisos por rol — API /api/v1/

> Verificación cruzada **Frontend ↔ Backend** del control de acceso por rol.
> Fecha: 2026-06-03 · Roles del sistema: `admin`, `tecnico`, `recepcion`.
>
> Esta auditoría se hizo leyendo el código real del backend (`TecnoFix-BackEnd`,
> Django + DRF) y comparándolo con cómo el frontend consume y gatea cada endpoint.
> **El gating del frontend es solo cosmético** (oculta UI); la seguridad real la
> impone el backend vía `permission_classes` / `get_permissions()`.

---

## 0. Baseline de seguridad

- **`config/settings/base.py`** define:
  - `DEFAULT_AUTHENTICATION_CLASSES`: `JWTAuthentication`
  - `DEFAULT_PERMISSION_CLASSES`: `IsAuthenticated`

✅ Ningún endpoint queda público por accidente: lo mínimo es estar autenticado.
Los únicos públicos por diseño son `auth/login/` y `auth/refresh/`.

### Clases de permiso disponibles (`core/permissions.py`)

| Clase | Lectura (GET) | Escritura (POST/PATCH/DELETE) |
|---|---|---|
| `IsAdmin` | solo admin | solo admin |
| `IsTecnico` | solo técnico | solo técnico |
| `IsRecepcion` | solo recepción | solo recepción |
| `IsAdminOrTecnico` | admin o técnico | admin o técnico |
| `IsAdminOrReadOnly` | cualquier autenticado | solo admin |
| `IsOwnerOrAdmin` (object) | dueño o admin | dueño o admin |

---

## 1. Resumen ejecutivo

✅ **Todo lo crítico-admin está correctamente protegido en el backend**: CRUD de
usuarios, auditoría (solo lectura admin), escritura de catálogos de cotizaciones,
y todos los `DELETE` de recursos sensibles exigen `IsAdmin`.

Sin embargo hay **3 desajustes de autorización** y **3 bugs funcionales** a revisar:

| # | Tipo | Endpoint | Problema |
|---|---|---|---|
| A1 | ⚠️ Autorización | `GET /users/`, `GET /users/{id}/` | Cualquier rol autenticado puede **enumerar todos los usuarios** (nombre, email, rol). El front trata `/usuarios` como admin-only. |
| A2 | ⚠️ Autorización | `POST /cotizaciones/{id}/autorizar/` | Acción muy sensible (crea orden, descuenta stock) abierta a **cualquier rol**. Ni front ni back la restringen. |
| A3 | ⚠️ Inconsistencia | varios (ver §3) | Backend **más estricto** que la UI: el front muestra botones que el back rechaza con 403. |
| B1 | 🐞 Funcional | `POST /users/auth/password-reset/` | El front lo llama, pero **no existe ruta** en el backend → 404. |
| B2 | 🐞 Funcional | `/inventario/compatibles/` | Front llama `compatibles/`, backend expone `compatibilidades/` → 404. |
| B3 | 🐞 Code smell | `FuenteApiViewSet` | Definido **dos veces** en `apps/cotizaciones/views.py` (la 2ª pisa la 1ª). |

---

## 2. Tabla completa de endpoints

Leyenda veredicto: ✅ correcto · ⚠️ revisar autorización · 🐞 bug funcional

### 2.1 Auth — `apps/users` (públicos por diseño)

| Endpoint | Método | Permiso back real | Front | Veredicto |
|---|---|---|---|---|
| `/users/auth/login/` | POST | AllowAny (TokenObtainPair) | público | ✅ |
| `/users/auth/refresh/` | POST | AllowAny (TokenRefresh) | público | ✅ |
| `/users/auth/password-reset/` | POST | **— no existe —** | `authApi.passwordReset` | 🐞 B1 |

### 2.2 Usuarios — `UsuarioViewSet` (front: ruta `/usuarios` admin-only)

| Endpoint | Método | Permiso back real | Front gating | Veredicto |
|---|---|---|---|---|
| `/users/` | GET (list) | **IsAuthenticated** | ruta admin-only | ⚠️ A1 |
| `/users/{id}/` | GET (retrieve) | **IsAuthenticated** | ruta admin-only | ⚠️ A1 |
| `/users/` | POST | IsAdmin | admin | ✅ |
| `/users/{id}/` | PATCH | IsAdmin | admin | ✅ |
| `/users/{id}/` | DELETE | IsAdmin | admin | ✅ |
| `/users/{id}/reset-password/` | POST | IsAdmin | admin | ✅ |
| `/users/{id}/change-password/` | POST | IsAuthenticated + IsOwnerOrAdmin | propio usuario | ✅ |
| `/users/{id}/activate/` | POST | IsAdmin | admin | ✅ |
| `/users/{id}/deactivate/` | POST | IsAdmin (+ no puede auto-desactivarse) | admin | ✅ |

> **A1 — detalle**: en `get_permissions()`, `list` y `retrieve` caen en
> `IsAuthenticated`. Un técnico o recepción puede `GET /api/v1/users/` y obtener la
> lista completa de usuarios con sus roles y correos. El frontend nunca muestra esa
> pantalla a no-admins, pero la API sí responde.
> **Cuidado al corregir**: `OrdenesPage` y `OrdenDetailPage` arman el dropdown de
> técnicos con `usersApi.list()` filtrando `rol === "tecnico"`. En `OrdenDetailPage`
> ese fetch está protegido por `enabled: isAdmin`, pero `OrdenesPage` lo usa sin
> gating de rol. Si se restringe `list` a `IsAdmin`, hay que dar a recepción/técnico
> otra forma de listar técnicos (p.ej. endpoint `?rol=tecnico` con permiso ampliado,
> o un endpoint dedicado `/users/tecnicos/`).

### 2.3 Clientes — `ClienteViewSet` / `DispositivoViewSet`

| Endpoint | Método | Permiso back real | Veredicto |
|---|---|---|---|
| `/clientes/` | GET, POST | IsAuthenticated | ✅ |
| `/clientes/{id}/` | GET, PATCH | IsAuthenticated | ✅ |
| `/clientes/{id}/` | DELETE | **IsAdmin** | ✅ (back más estricto, ok) |
| `/clientes/dispositivos/` | GET, POST | IsAuthenticated | ✅ |
| `/clientes/dispositivos/{id}/` | GET, PATCH | IsAuthenticated | ✅ |
| `/clientes/dispositivos/{id}/` | DELETE | **IsAdmin** | ✅ |

### 2.4 Órdenes — `OrdenViewSet` / `EvidenciaViewSet`

| Endpoint | Método | Permiso back real | Front gating | Veredicto |
|---|---|---|---|---|
| `/ordenes/` | GET, POST | IsAuthenticated | — | ✅ |
| `/ordenes/{id}/` | GET, PATCH | IsAuthenticated | — | ✅ |
| `/ordenes/{id}/` | DELETE | IsAdmin | `isAdmin` | ✅ |
| `/ordenes/{id}/cambiar-estado/` | POST | IsAuthenticated | — | ✅ |
| `/ordenes/{id}/asignar-tecnico/` | POST | IsAdmin | `isAdmin` | ✅ |
| `/ordenes/{id}/agregar-refaccion/` | POST | **IsAdmin** | sin gating (UI a todos) | ⚠️ A3 |
| `/ordenes/evidencias/` | GET, POST | IsAuthenticated | — | ✅ |
| `/ordenes/evidencias/{id}/` | DELETE | **IsAdmin** | sin gating (UI a todos) | ⚠️ A3 |

### 2.5 Inventario — `RefaccionViewSet` / `RefaccionCompatibleViewSet`

| Endpoint | Método | Permiso back real | Front gating | Veredicto |
|---|---|---|---|---|
| `/inventario/` | GET | IsAuthenticated | — | ✅ |
| `/inventario/` | POST | IsAdmin | `isAdmin` | ✅ |
| `/inventario/{id}/` | GET | IsAuthenticated | — | ✅ |
| `/inventario/{id}/` | PATCH, DELETE | IsAdmin | `isAdmin` | ✅ |
| `/inventario/{id}/ajustar-stock/` | POST | **IsAdminOrTecnico** | sin gating (UI a todos, incl. recepción) | ⚠️ A3 |
| `/inventario/bajo-stock/` | GET | IsAdmin (cae en `else`) | no usado por el front | ✅ (revisar si se quiere) |
| `/inventario/compatibilidades/` | GET | IsAdminOrReadOnly | front llama `compatibles/` | 🐞 B2 |
| `/inventario/compatibilidades/` | POST, DELETE | IsAdmin (write) | — | 🐞 B2 |

> **B2 — detalle**: el router registra `compatibilidades`
> (`apps/inventario/urls.py`), pero `ENDPOINTS.inventario.compatibles` en el front
> apunta a `/inventario/compatibles/`. Cualquier llamada del front a compatibles
> daría 404. Decidir el nombre canónico y alinear ambos lados.

### 2.6 Cotizaciones — configuración (catálogos)

| Endpoint | Métodos | Permiso back real | Veredicto |
|---|---|---|---|
| `/cotizaciones/categorias/` (+ `{id}/`) | GET / POST·PATCH·DELETE | IsAdminOrReadOnly | ✅ |
| `/cotizaciones/categorias/reorder/` | POST | IsAdmin | ✅ |
| `/cotizaciones/subcategorias/` (+ `{id}/`) | GET / write | IsAdminOrReadOnly | ✅ |
| `/cotizaciones/subcategorias/reorder/` | POST | IsAdmin | ✅ |
| `/cotizaciones/tipos-reparacion/` (+ `{id}/`) | GET / write | IsAdminOrReadOnly | ✅ |
| `/cotizaciones/tipos-reparacion/reorder/` | POST | IsAdmin | ✅ |
| `/cotizaciones/formulas/` (+ `{id}/`) | GET / write | IsAdminOrReadOnly | ✅ |
| `/cotizaciones/formulas/disponibles/` | GET | IsAdminOrReadOnly (acción list-route) | ✅ |
| `/cotizaciones/fuentes-api/` (+ `{id}/`) | GET / write | IsAdminOrReadOnly | ✅ (ver B3) |
| `/cotizaciones/productos-api/` | GET | IsAuthenticated (ReadOnly) | ✅ |
| `/cotizaciones/resolver-formula/` | GET | IsAuthenticated | ✅ |

### 2.7 Cotizaciones — documento

| Endpoint | Método | Permiso back real | Front gating | Veredicto |
|---|---|---|---|---|
| `/cotizaciones/` | GET, POST | IsAuthenticated | — | ✅ |
| `/cotizaciones/{id}/` | GET | IsAuthenticated | — | ✅ |
| `/cotizaciones/{id}/` | DELETE | IsAdmin | `isAdmin` | ✅ |
| `/cotizaciones/{id}/items/` | POST | IsAuthenticated (+ solo borrador) | — | ✅ |
| `/cotizaciones/{id}/items/{itemId}/` | DELETE | IsAuthenticated (+ solo borrador) | — | ✅ |
| `/cotizaciones/{id}/cambiar-estado/` | POST | IsAuthenticated | — | ✅ |
| `/cotizaciones/{id}/autorizar/` | POST | **IsAuthenticated** | sin gating | ⚠️ A2 |
| `/cotizaciones/{id}/reportar-cancelacion/` | POST | IsAuthenticated (+ solo finalizada) | — | ✅ |
| `/cotizaciones/{id}/pdf-cliente/` | GET | IsAuthenticated | — | ✅ |
| `/cotizaciones/{id}/pdf-empresa/` | GET | IsAuthenticated | — | ✅ |

> **A2 — detalle**: `autorizar` crea cliente/dispositivo/orden, descuenta stock y
> marca la cotización como autorizada (transacción atómica). Hoy la puede ejecutar
> **cualquier rol autenticado**. Definir si debe quedar `IsAdmin` o
> `IsAdminOrRecepcion`. El backend ya valida el estado (`finalizada`) y la coherencia
> del adelanto, pero **no** valida el rol.

### 2.8 Publicaciones — `ExportarPngView`

| Endpoint | Método | Permiso back real | Veredicto |
|---|---|---|---|
| `/publicaciones/exportar-png/` | POST | IsAuthenticated | ✅ |

### 2.9 Auditoría — `AuditLogViewSet`

| Endpoint | Método | Permiso back real | Veredicto |
|---|---|---|---|
| `/auditoria/` | GET (list) | IsAdmin | ✅ |
| `/auditoria/{id}/` | GET (retrieve) | IsAdmin | ✅ |

---

## 3. Inconsistencias front/back (A3) — backend más estricto que la UI

Estos endpoints **están seguros** (el back rechaza con 403), pero la UI muestra el
botón a roles que no pueden usarlo, generando fricción / errores 403 en pantalla.
Hay que decidir, por cada uno, si **relajar el backend** (permitir el rol) o
**gatear la UI** (ocultar el botón):

| Endpoint | Back exige | UI lo muestra a | Decisión sugerida |
|---|---|---|---|
| `POST /ordenes/{id}/agregar-refaccion/` | admin | todos | ¿Técnico debería poder? → probablemente `IsAdminOrTecnico` |
| `DELETE /ordenes/evidencias/{id}/` | admin | todos | gatear UI a admin, o permitir al técnico dueño |
| `POST /inventario/{id}/ajustar-stock/` | admin o técnico | todos (incl. recepción) | gatear UI: ocultar a recepción |

---

## 4. Bugs funcionales (no son hoyos de seguridad)

- **B1** — `POST /users/auth/password-reset/`: el front (`authApi.passwordReset`,
  pantalla de login "olvidé contraseña") lo invoca, pero `apps/users/urls.py` solo
  define `auth/login/` y `auth/refresh/`. Falta implementar la ruta o quitar la
  llamada del front.
- **B2** — Mismatch de nombre: front `/inventario/compatibles/` ↔ back
  `/inventario/compatibilidades/`. Alinear.
- **B3** — `FuenteApiViewSet` está declarado **dos veces** en
  `apps/cotizaciones/views.py` (≈ línea 373 y ≈ línea 419). La segunda definición
  pisa a la primera; `urls.py` importa la segunda. Sin impacto de seguridad (ambas
  `IsAdminOrReadOnly`), pero es código muerto a limpiar.

---

## 5. Recomendaciones priorizadas (para el backend)

1. **A1 (media)** — Restringir `list`/`retrieve` de `UsuarioViewSet` a `IsAdmin`,
   y resolver la dependencia del dropdown de técnicos (endpoint dedicado o filtro
   `?rol=tecnico` con permiso ampliado).
2. **A2 (media-alta)** — Añadir `permission_classes` de rol a la acción `autorizar`
   (probablemente `IsAdmin` o `IsAdminOrRecepcion`). Es la acción más sensible sin
   control de rol.
3. **A3 (baja)** — Conciliar los 3 endpoints de §3: decidir por producto si se
   relaja el back o se gatea la UI; dejar ambos lados consistentes.
4. **B1 / B2 / B3 (baja)** — Corregir los bugs funcionales.

---

## 6. Prompt para ejecutar en el backend

> Pegar en el repo **TecnoFix-BackEnd** si se quiere que el agente del back aplique
> las correcciones tras revisar este documento.

```
Lee docs/backend-docs/auditoria-permisos-endpoints.md (auditoría de permisos por rol
del frontend). Quiero que verifiques en el código actual y me confirmes cada hallazgo,
y propongas el fix mínimo para:

A1) UsuarioViewSet.get_permissions(): list y retrieve están en IsAuthenticated, lo que
    deja que técnico/recepción enumeren todos los usuarios. Evalúa restringir a IsAdmin
    SIN romper el dropdown de técnicos que usa OrdenesPage/OrdenDetailPage (considera un
    endpoint o filtro ?rol=tecnico accesible a roles operativos).

A2) Acción 'autorizar' de CotizacionViewSet: hoy IsAuthenticated. Es la acción más
    sensible (crea orden, descuenta stock). Propón permission_classes por rol
    (IsAdmin o IsAdminOrRecepcion según definamos).

A3) Inconsistencias donde el back es más estricto que la UI: agregar-refaccion (IsAdmin),
    evidencias destroy (IsAdmin), inventario ajustar-stock (IsAdminOrTecnico). Dime para
    cada uno si conviene relajar el permiso o si lo dejamos y se gatea la UI.

B1) Falta la ruta auth/password-reset/ en apps/users/urls.py aunque el front la llama.
B2) Mismatch: router 'compatibilidades' vs front '/inventario/compatibles/'.
B3) FuenteApiViewSet está definido dos veces en apps/cotizaciones/views.py.

Para cada punto: archivo, línea, código actual y el cambio propuesto. No apliques nada
hasta que yo apruebe.
```
