# fix(cotizaciones): scroll fiable en el diálogo de autorización — v1.4.1

## Motivación

En el diálogo **Autorizar cotización**, cuando el contenido no cabía (ventana baja o
la app de escritorio), el cuerpo se cortaba **sin barra de scroll** y los campos de
abajo quedaban inaccesibles. Ocurría en cualquier paso del asistente.

## Causa

El `ScrollArea` de Radix no resolvía su altura dentro de un contenedor
`flex-1 min-h-0` cuyo padre (`DialogContent`) solo tiene `max-h-[90vh]` y no una
altura fija. En CSS, `max-height` no cuenta como "altura definida" para resolver el
`height:100%` interno del viewport de Radix, así que el área crecía con el contenido
en vez de recortarlo y scrollear; el sobrante lo cortaba el `max-h` del diálogo.

No es específico de plataforma: la app usa WebView2 (mismo Chromium que el
navegador). Dependía de la altura de la ventana, por eso se notaba más en la app.

## Cambios

### `src/features/cotizaciones/components/AutorizarCotizacionDialog.tsx`
- `ScrollArea` (Radix) → `<div className="flex-1 min-h-0 overflow-y-auto p-1.5 pr-3">`.
- Eliminado el wrapper redundante y el import de `ScrollArea`.
- Conservado el padding `p-1.5 pr-3` (focus ring, de v1.4.0).

### Versión
- `package.json` y `src-tauri/tauri.conf.json` → `1.4.1`.

> El scroll nativo es consistente con el que ya se usaba en este mismo diálogo
> (lista de búsqueda de cliente, `max-h-48 overflow-y-auto`).

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/features/cotizaciones/components/AutorizarCotizacionDialog.tsx` | scroll nativo en vez de Radix `ScrollArea` |
| `package.json` | versión 1.4.1 |
| `src-tauri/tauri.conf.json` | versión 1.4.1 |
| `docs/changelogs/v1.4.1.md` | changelog |
| `docs/all/doc-fix-scroll-autorizar-dialog.md` | documentación técnica |

---

## Build / prueba

```bash
npm run build      # tsc + vite (verificado: OK)
```

1. Abrir una cotización finalizada → **Autorizar cotización**.
2. En una ventana baja (o en la app de escritorio), recorrer los pasos 1–3.
3. El cuerpo del diálogo scrollea y todos los campos/secciones quedan accesibles;
   el footer (Atrás / Continuar / Autorizar) se mantiene fijo.
