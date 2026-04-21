# Módulo de Auditoría

## Qué muestra

Registro de todas las acciones realizadas en el sistema: creaciones, ediciones,
cambios de estado, asignaciones, eliminaciones e inicios de sesión.

Solo visible para usuarios con rol `admin`.

## Campos del backend

El serializer devuelve:

| Campo | Descripción |
|---|---|
| `user_nombre` | Nombre del usuario que realizó la acción. `"Sistema"` si no hay usuario asociado. |
| `action_display` | Etiqueta legible de la acción (ej. `"Actualización"`, `"Crear"`). |
| `action` | Código interno (`CREATE`, `UPDATE`, `DELETE`, `ASSIGN`, `STATUS_CHANGE`, `LOGIN`). |
| `entity` | Nombre del modelo afectado (`orden`, `cliente`, `user`, etc.). |
| `entity_id` | ID del registro afectado. |
| `old_value` | Estado del objeto antes del cambio (JSON). |
| `new_value` | Estado del objeto después del cambio (JSON). |
| `ip_address` | IP desde donde se realizó la acción. |
| `created_at` | Fecha y hora de la acción. |

## Vista de detalle (ojito)

Al hacer clic en el ícono de ojo se abre un dialog con el detalle del registro.
Los cambios se muestran de forma legible según el tipo de acción:

| Acción | Vista |
|---|---|
| `CREATE` | Tabla con todos los campos del objeto creado |
| `DELETE` | Tabla con los campos del objeto eliminado |
| `UPDATE`, `ASSIGN`, `STATUS_CHANGE` | Solo campos que cambiaron: **Antes** (fondo gris) → **Después** (fondo cian) |
| `LOGIN` | Mensaje simple sin datos adicionales |

Los campos técnicos (`id`, `created_at`, `updated_at`) se ocultan en la vista de detalle.
Los nombres de campo se traducen al español mediante `FIELD_LABELS` en `AuditoriaPage.tsx`.

## Filtros disponibles

- **Acción**: filtra por tipo de acción.
- **Entidad**: filtra por modelo afectado.

Ambos filtros resetean la paginación a la página 1 al cambiar.

## Agregar más etiquetas de campos

Si el backend agrega nuevos modelos o campos, agregar la traducción en `FIELD_LABELS`
dentro de `src/features/auditoria/AuditoriaPage.tsx`:

```ts
const FIELD_LABELS: Record<string, string> = {
  mi_campo_nuevo: "Mi Campo",
  // ...
};
```
