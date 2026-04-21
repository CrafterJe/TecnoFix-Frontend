# Tipografía y estilos globales

## Tipografía

**Fuente principal:** Montserrat (variable font, todos los pesos 100–900).

Auto-hospedada en `public/fonts/montserrat/` — funciona sin conexión a internet.

Archivos usados:
- `Montserrat-VariableFont_wght.ttf` — estilos normales
- `Montserrat-Italic-VariableFont_wght.ttf` — estilos itálica

Configurada en `src/index.css` mediante `@font-face` y aplicada al `body` con `font-sans`.
Registrada en `tailwind.config.ts` como `fontFamily.sans`.

**Fuente monoespaciada:** JetBrains Mono (cargada desde Google Fonts).
Usada exclusivamente para números de orden con la clase `.font-order`.

## Colores

| Token | Valor | Uso |
|---|---|---|
| `primary` | `#2D2B6E` (HSL 242 44% 30%) | Color principal, botones, sidebar fondo, anillo de foco |
| `accent` | `#02C5CE` (HSL 183 98% 41%) | Acentos, links activos del sidebar, badges de estado |

Definidos como variables CSS en `src/index.css` bajo `:root` y `.dark`.
Nunca usar los defaults azules de shadcn — siempre referenciar `primary` y `accent`.

## Modo oscuro

La app opera en modo oscuro por defecto (clase `dark` en el HTML raíz).
Las variables CSS del modo claro están definidas pero no se usan actualmente.

## Scrollbar personalizado

Definido en `src/index.css`:
- Ancho: 6px
- Track transparente
- Thumb: `muted-foreground/30`, redondeado
- Hover: `muted-foreground/50`
