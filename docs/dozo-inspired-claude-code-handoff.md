# Handoff para Claude Code: rediseño estilo Dozo

## Brief corto

Queremos rediseñar la app `nihongo-feed-safe` para que se sienta muy parecida en estructura y experiencia a Nihongo Dozo, pero con marca Pako Nihongo, textos en español y enfoque en alumnos reales de Pako.

No es una copia literal de marca/contenido. Es una adaptación de patrones: sidebar, dashboard, cards, progreso, unidades, lectura con controles, tareas, feedback, repaso y ayuda contextual.

## Archivos de contexto obligatorios

Leer antes de tocar código:

- `/Users/pako/Trabajo/CLAUDE.md`
- `/Users/pako/Trabajo/MARCA.md`
- `/Users/pako/Trabajo/nihongo-dozo-app-map.md`
- `/Users/pako/Trabajo/nihongo-feed-safe/docs/dozo-inspired-master-plan.md`
- `/Users/pako/Trabajo/nihongo-feed-safe/docs/dozo-inspired-visual-spec.md`
- `/Users/pako/Trabajo/nihongo-feed-safe/docs/dozo-inspired-functional-spec.md`
- `/Users/pako/Trabajo/nihongo-feed-safe/docs/design-system.md`

## Proyecto

- Path: `/Users/pako/Trabajo/nihongo-feed-safe`
- Stack: Next.js 16, React 19, TypeScript, Supabase.
- Scripts:
  - `npm run dev`
  - `npm run build`
  - `npm run lint`

## Reglas de producto importantes

- No mencionar app iOS/macOS.
- Solo web app.
- Los modulos visibles para alumnos se llaman `1`, `2`, `3`, etc. No exponer slugs internos.
- Alumnos no deben ver:
  - gramatica completa,
  - rubricas,
  - checklists,
  - definiciones internas de proyectos,
  - criterios de avance.
- Alumnos si pueden ver:
  - nombre del modulo,
  - nivel,
  - can-do,
  - temas de vocabulario,
  - competencias,
  - nombres de proyectos.

## Primera tarea recomendada

Crear un shell Dozo-like reutilizable y aplicarlo a una ruta nueva, sin romper lo existente.

Ruta sugerida:

- Crear `/dashboard` como nueva experiencia experimental.

Componentes sugeridos:

- `components/dashboard/StudentAppShell.tsx`
- `components/dashboard/StudentSidebar.tsx`
- `components/dashboard/TopStudyBar.tsx`
- `components/dashboard/FloatingHelpButtons.tsx`
- `components/dashboard/ModuleHero.tsx`
- `components/dashboard/StatTile.tsx`
- `components/dashboard/FeatureCard.tsx`
- `components/dashboard/UnitListRow.tsx`

Pagina:

- `app/dashboard/page.tsx`

Objetivo de la primera version:

- Shell visual casi igual en estructura a Dozo.
- Marca Pako.
- Dashboard con datos reales cuando sean faciles y mock cuando no.
- Links hacia rutas existentes.
- Responsive basico.

## Dashboard inicial

Debe incluir:

- Sidebar desktop con secciones:
  - APRENDER: Inicio, Kana, Vocabulario, Kanji, Gramatica
  - PRACTICAR: Lecturas, Escucha, Repaso
  - CLASE: Mi plan, Tareas, Comunidad
  - CUENTA: Progreso, Perfil
- Topbar:
  - Hoy: tiempo de estudio.
  - Racha.
  - Boton `Empezar`.
- Banner:
  - Aviso de Pako o tema de la semana.
- Hero:
  - "Pako Nihongo"
  - Modulo actual.
  - Progreso y tareas pendientes.
- Cards principales:
  - Kana
  - Vocabulario
  - Kanji
  - Lecturas
  - Escucha
  - Repaso
- Card de `Esta semana`.
- Card de `Tareas pendientes`.
- Botones flotantes:
  - Ayuda
  - Avisos

## Datos para dashboard

Reusar lo que ya exista:

- `lib/curriculum-modules.ts`
- Supabase auth/profile si la ruta ya requiere sesion.
- `lib/streak.ts`
- APIs existentes:
  - `/api/grupos-modulos`
  - `/api/grupos-progreso`
  - `/api/colecciones`

Si algo es lento o incierto, usar mock data local bien marcada para la primera version.

## Estilo

Usar:

- Navy `#1A1A2E`
- Rojo `#E63946`
- Turquesa `#4ECDC4`
- Crema `#FFF8E7`
- Cards blancas.
- Sidebar navy.
- Gradientes solo en hero/cards principales.
- Radios 14-20px.
- Sombras suaves.
- Tipografias ya configuradas en el layout si existen.

Evitar:

- Copiar logo Dozo.
- Copiar textos de Dozo.
- Usar morado dominante.
- Usar UI oscura en el contenido principal.
- Meter demasiadas cards dentro de cards.

## Interacciones minimas de primera version

- Sidebar item activo.
- Mobile bottom nav o menu compacto.
- Cards linkean a rutas existentes.
- Boton ayuda abre drawer/panel local.
- Boton avisos abre panel local.
- `Empezar` lleva a `/study` o `/practicar`.

## Segunda tarea recomendada

Crear pantalla `/dashboard/lecturas` y un reader estilo Dozo.

Componentes:

- `ReadingCatalog`
- `ReadingCard`
- `ReadingViewer`
- `ReaderToolbar`
- `ReaderParagraph`

MVP:

- 3 lecturas mock del modulo 1.
- Furigana ON/OFF si los datos lo permiten.
- Traduccion ON/OFF.
- Tamano de fuente.
- Progreso por parrafo local.
- Boton preguntar.

No fingir audio si no hay audio.

## Tercera tarea recomendada

Crear `/dashboard/tareas`.

MVP:

- Lista de tareas pendientes y completadas.
- Estados vacios.
- Cards con modulo, tipo, fecha y CTA.
- Si hay admin assignment data existente, conectarla.
- Si no, mock data local con `TODO`.

## Verificacion

Despues de implementar:

- `npm run lint`
- `npm run build`
- Levantar dev server y revisar:
  - desktop ancho 1440.
  - mobile 390.
- Revisar:
  - no overflow horizontal.
  - sidebar no tapa contenido.
  - bottom nav no tapa botones.
  - contraste suficiente.
  - textos en español.
  - no slugs internos visibles.

## Resultado esperado del primer PR/cambio

Un usuario puede abrir `/dashboard` y sentir una experiencia tipo Dozo:

- navegacion lateral,
- topbar de estudio,
- dashboard con cards,
- progreso,
- tareas,
- ayudas,
- links a practica real existente.

No se espera que todo el producto este migrado en el primer cambio.
