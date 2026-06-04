# Fix — scroll fiable en el diálogo de autorización de cotización

> Documentación técnica de la versión **v1.4.1**.
> PR: [pr-fix-scroll-autorizar-dialog-v1.4.1.md](../PR/pr-fix-scroll-autorizar-dialog-v1.4.1.md) ·
> Changelog: [v1.4.1.md](../changelogs/v1.4.1.md)

## Síntoma

En el diálogo **Autorizar cotización**, cuando el contenido no cabía (ventana baja
o la app de escritorio, que abre en una ventana más corta), el cuerpo se **cortaba
sin barra de scroll**: los campos/secciones de abajo quedaban inaccesibles. Ocurría
en cualquier paso del asistente (se observó en el paso 1 y en el paso 3 de
confirmación).

## Análisis de la causa

Estructura del diálogo:

```
DialogContent  → max-h-[90vh] flex flex-col   (altura por contenido, tope 90vh; sin overflow propio)
  ├─ DialogHeader        (auto)
  ├─ stepper             (auto)
  ├─ Separator
  ├─ ScrollArea (Radix)  → flex-1 min-h-0      (Root overflow-hidden + Viewport h-full)
  └─ DialogFooter        (shrink-0)
```

Para que el `ScrollArea` de Radix active el scroll, su `Viewport` interno
(`height: 100%`) necesita que su padre tenga una **altura definida**. La cadena aquí
era frágil:

1. `DialogContent` no tiene altura fija, solo `max-h-[90vh]`. En CSS, un `max-height`
   **no cuenta como altura definida** para resolver porcentajes de los hijos.
2. El `ScrollArea` es `flex-1`; su altura la decide el algoritmo flex, pero al estar
   el contenedor topado solo por `max-h` (no fijo), esa altura podía quedar
   **indefinida** para el `height:100%` del Viewport de Radix.
3. Sin altura resuelta, el Viewport **crecía con el contenido** en vez de recortarlo
   y scrollear. El sobrante lo recortaba visualmente el `max-h-[90vh]` del diálogo
   (que no tiene scroll propio) → contenido cortado **sin barra de scroll**.

**No es específico de plataforma.** La app de escritorio usa WebView2 (mismo motor
Chromium que el navegador), así que es un bug de layout/CSS que se reproduce en
ambos; lo que cambia es **cuándo se hace visible**, en función de la altura de la
ventana. La app abre en ventana más baja → el contenido supera el alto disponible y
se nota; en navegador maximizado el contenido cabe bajo 90vh y no hace falta scroll.

## Solución

Se reemplazó el `ScrollArea` de Radix por un `div` con **overflow nativo**:

```tsx
// Antes
<ScrollArea className="flex-1 min-h-0">
  <div className="p-1.5 pr-3">
    {step === 1 && ( ... )}
    ...
  </div>
</ScrollArea>

// Después
<div className="flex-1 min-h-0 overflow-y-auto p-1.5 pr-3">
  {step === 1 && ( ... )}
  ...
</div>
```

- `overflow-y-auto` dentro de `flex-1 min-h-0` scrollea de forma fiable en
  Chromium/WebView2, sin depender de la resolución interna de Radix.
- Se conservó el padding `p-1.5 pr-3` para que el focus ring de inputs/selects no se
  recorte (fix de v1.4.0).
- Se eliminó el import de `ScrollArea` (ya no se usa en el archivo).

**Por qué overflow nativo y no altura fija:** poner `h-[90vh]` al diálogo lo haría
verse siempre altísimo aunque el contenido fuera corto. El `overflow-y-auto` solo
muestra scroll cuando hace falta. Además es **consistente** con el scroll nativo que
ya se usaba en este mismo diálogo (la lista de búsqueda de cliente es
`max-h-48 overflow-y-auto`).

## Verificación

- `npm run build` (tsc + vite): OK.
- Manual: abrir una cotización finalizada → **Autorizar** → en ventana baja, los
  pasos 1–3 scrollean y todos los campos/secciones quedan accesibles.
