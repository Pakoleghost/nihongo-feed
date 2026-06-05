# Nihongo Feed — Brand Memory

## Colores de marca

### Paleta principal
| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--color-primary` | `#1A1A2E` | Texto principal, cards oscuras, títulos de página |
| `--color-accent-strong` | `#E63946` | Acento fuerte: botones primarios, nav activo, Smart card |
| `--color-accent` | `#4ECDC4` | Acento secundario: Kanji, highlights, focus ring |
| `--color-bg` | `#FFF8E7` | Fondo global (crema cálido) |
| `--color-surface` | `#FFFFFF` | Fondo de cards y superficies |

### Paleta de soporte
| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--color-text-muted` | `#53596B` | Subtítulos, texto secundario |
| `--color-text-muted` (alt) | `#9CA3AF` | Iconos inactivos, placeholders, nav inactivo |
| `--color-border` | `rgba(26,26,46,0.14)` | Bordes de cards |
| `--color-border-strong` | `rgba(26,26,46,0.22)` | Divisores más marcados |
| — | `#C4BAB0` | Acento izquierdo de card "Libre" (gris cálido decorativo) |
| — | `#C53340` | Estado pressed/hover del rojo |
| — | `#178A83` | Estado pressed/hover del teal |

### Frecuencia de uso (regla 80-15-5)
- **80% neutros**: `#1A1A2E`, `#FFFFFF`, `#FFF8E7`, grises
- **15% acento suave**: `#4ECDC4` y sus variantes
- **5% acento fuerte**: `#E63946` — solo para el elemento más importante de la pantalla

## Tipografía

### Familias
| Variable | Fuente | Weights | Uso |
|----------|--------|---------|-----|
| `--font-study` → `DS.fontHead` | **Plus Jakarta Sans** | 500 600 700 800 | Títulos, botones, UI principal — la voz de la app |
| `--font-latin` | **Poppins** | 400 500 600 700 | Cuerpo de texto latino, fallback |
| `--font-noto-sans-jp` | **Noto Sans JP** | 400 500 700 | Texto japonés en prosa y etiquetas |
| `--font-noto-serif-jp` → `DS.fontKana` | **Noto Serif JP** | 400 500 | Kana/kanji en tarjetas de estudio (más legible) |

### Stack completo (body por defecto)
```
Poppins → Noto Sans JP → system-ui → Hiragino Sans → Yu Gothic → Meiryo → sans-serif
```

### Escala tipográfica (CSS variables)
| Token | Valor | Uso |
|-------|-------|-----|
| `--text-display` | `clamp(2rem, 4vw, 3.25rem)` | Heroes grandes |
| `--text-h1` | `2rem` (32px) | — |
| `--text-h2` | `1.5rem` (24px) | — |
| `--text-h3` | `1.125rem` (18px) | — |
| `--text-body-lg` | `1rem` (16px) | — |
| `--text-body` | `0.9375rem` (15px) | Cuerpo por defecto |
| `--text-body-sm` | `0.8125rem` (13px) | Labels, badges |

### Convenciones en código
- Títulos de página: `fontSize: "42px", fontWeight: 800, color: "#1A1A2E"`
- Subtítulos de página: `fontSize: "14px", color: "#7A7F8D"`
- Títulos de card: `fontSize: "18–20px", fontWeight: 800, color: "#1A1A2E"`
- Subtítulos de card: `fontSize: "13px", color: "#7A7F8D"`
- Badges/tags: `fontSize: "10–11px", fontWeight: 700`
- Texto japonés en práctica: usar `DS.fontKana` (Noto Serif JP)

## Border radius
| Uso | Valor |
|-----|-------|
| Cards principales | `12–16px` |
| Modal / bottom sheet | `20px` |
| Botones de acción | `8–10px` |
| Badges y tags | `6px` |
| Inputs | `12px` |
| Nunca usar | `999px` con padding grande — se ve blobby |

## Sombras
| Token / descripción | Valor |
|--------------------|-------|
| Card plana (nivel 0) | `0 2px 10px rgba(26,26,46,0.07)` |
| Card elevada (hover, modal) | `0 4px 20px rgba(26,26,46,0.10)` |
| Card muy elevada | `0 8px 28px rgba(26,26,46,0.12)` |
| Inset border (left accent) | `inset 4px 0 0 {color}` |
| Inset outline | `inset 0 0 0 1px rgba(26,26,46,0.14)` |
| **Nunca usar** | sombras de color tintado (ej. `rgba(230,57,70,0.3)`) — reserva las sombras para navy neutro |

## Espaciado
```
4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48
```
- Padding de página: `16px`
- Gap entre cards: `12px`
- Padding interno de card: `14–20px`
- Container máximo: `760px`

## Tipografía — convenciones de uso
| Elemento | fontSize | fontWeight | lineHeight | letterSpacing |
|----------|----------|------------|------------|---------------|
| Título de página | 42px | 800 | 1 | — |
| Subtítulo de página | 14px | 400 | — | — |
| Título de card grande | 20–22px | 800 | 1.1 | — |
| Título de card normal | 17–18px | 800 | 1.1 | — |
| Subtítulo de card | 13px | 400 | 1.4 | — |
| Etiqueta ALL CAPS | 11px | 700 | — | `0.08em` |
| Badge / tag | 10–11px | 700 | — | — |
| Número hero grande | 28–36px | 800 | 1 | `-0.5` a `-0.8` |
| Kana en flashcard | 60–80px | — | 1 | — (usa fontKana) |

Headings: `letter-spacing: -0.04em` global. Titulares grandes: hasta `-0.05em`.

## Animaciones / transiciones
- UI sutil (hover, toggle): `140ms ease`
- Transición de página o card flip: `260ms ease` / `0.3s`
- Framer Motion estándar: `duration: 0.2–0.25`
- Card flip: `0.45s cubic-bezier(0.4, 0, 0.2, 1)`
- `transform: translateY(1px)` en `:active` de botones primarios

## Componentes CSS globales (globals.css)
| Clase | Descripción |
|-------|-------------|
| `.ds-container` | `max-width: 760px`, centrado, padding lateral `16px` |
| `.ds-card` | Card base: fondo blanco, border `rgba(26,26,46,0.14)`, radius `24px`, shadow |
| `.ds-btn` | Botón primario navy — `min-height: 42px`, radius `999px` en CSS global |
| `.ds-btn-secondary` | Botón outline blanco |
| `.ds-btn-ghost` | Botón transparente, hover en teal suave |
| `.ds-label` | Etiqueta uppercase `0.75rem 700 0.08em tracking` |
| `.appTopNav` | Barra de navegación sticky con backdrop-blur |

> **Nota:** En código inline (React inline styles) los botones usan `8–10px` radius — las clases CSS globales todavía tienen `999px` pero se reemplazarán progresivamente.

## Mobile / PWA
- Safe area: `padding-bottom: env(safe-area-inset-bottom, 0px)` en todo lo que toca el borde inferior
- Viewport completo: `height: 100dvh` (no `100vh`) para evitar recorte en Safari
- Bottom nav: `60px` de altura — las páginas deben tener `paddingBottom` equivalente
- `overscroll-behavior: none` en pantallas de práctica de tiempo real
- No usar `position: fixed` para contenido que debe scrollear — usar flex column con `minHeight: 0`

## Principios de diseño
- **80 / 15 / 5**: 80% neutros, 15% teal suave, 5% rojo fuerte — el rojo solo en el elemento más importante de la pantalla
- **Left accent border** en cards secundarias: `inset 4px 0 0 {color}` — da identidad de color sin inundar el fondo
- **Un héroe por pantalla**: si el Smart card es rojo, todo lo demás es blanco
- **No gradientes en color de texto o botones** — solo fondos sólidos
- **No emojis en UI estructural** — usar SVG inline con `stroke={color}` para que hereden el tema
