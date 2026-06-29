# Especificacion visual: Pako Nihongo estilo Dozo

Fecha: 2026-06-21

## Direccion visual

Inspiracion estructural: Dozo.

Identidad visual: Pako Nihongo.

Sensacion deseada:

- App limpia, calida y guiada.
- Menos "red social", mas "portal de estudio".
- Visualmente parecida a Dozo en layout, cards, navegacion y microinteracciones.
- Mas personal y de clase que producto SaaS generico.

## Paleta

Usar marca existente:

- Navy: `#1A1A2E`
- Rojo: `#E63946`
- Turquesa: `#4ECDC4`
- Crema: `#FFF8E7`
- Naranja: `#F4A261`
- Azul medio: `#457B9D`

Fondos:

- App background principal: `#FFF8E7` o `#FDFCF5`
- Sidebar desktop: `#1A1A2E`
- Cards: `#FFFFFF`
- Cards suaves: `#FAF3E2`
- Borders: `rgba(26,26,46,0.08)`
- Text main: `#1A1A2E`
- Text muted: `rgba(26,26,46,0.58)`

Gradientes:

- Se pueden usar en cards hero y modulos, como Dozo, pero con sobriedad.
- Gradiente principal: navy -> rojo o turquesa -> navy.
- No usar rojo como fondo extenso de lectura.

Ejemplos:

- Hero dashboard: `linear-gradient(135deg, #1A1A2E 0%, #26324D 55%, #4ECDC4 100%)`
- Card de accion principal: `linear-gradient(135deg, #E63946 0%, #F4A261 100%)`
- Card de repaso: `linear-gradient(135deg, #4ECDC4 0%, #457B9D 100%)`

## Tipografia

Seguir marca:

- Titulos/UI: Plus Jakarta Sans.
- Cuerpo: Poppins.
- Japones: Noto Sans JP.

Escala sugerida:

- Page title desktop: 32-40px, 800.
- Page title mobile: 28-32px, 800.
- Section title: 22-26px, 800.
- Card title: 18-20px, 800.
- Body: 14-16px, 400/500.
- Microcopy/labels: 11-12px, 700, uppercase cuando sea etiqueta.
- Japones en cards: 28-48px segun jerarquia.

Nota: Dozo usa mucha claridad tipografica y pesos altos. Replicar eso, pero sin texto gigante innecesario.

## Layout desktop

Dimensiones:

- Sidebar: 248px.
- Top bar height: 72px.
- Main max width: 980-1120px.
- Page padding: 32px desktop.
- Card gap: 16-20px.

Estructura:

```text
┌──────────────┬───────────────────────────────────────────────┐
│ Sidebar      │ Top bar: Today / streak / quick start          │
│              ├───────────────────────────────────────────────┤
│ Learn        │ Beta/announcement banner optional              │
│ Practice     │ Page hero                                      │
│ Clase        │ Feature cards / content                        │
│ Cuenta       │                                               │
│ Profile      │ Floating support/alerts                        │
└──────────────┴───────────────────────────────────────────────┘
```

## Layout mobile

Estructura:

- Top header compacto con logo/avatar.
- Main content full width.
- Bottom nav con 4-5 tabs max:
  - Inicio.
  - Aprender.
  - Practicar.
  - Clase.
  - Perfil.
- Secondary navigation en sheets/cards dentro de cada tab.

No intentar meter todo el sidebar en mobile visible permanentemente.

## Componentes base

### StudentAppShell

Responsabilidad:

- Layout global.
- Sidebar desktop.
- Topbar.
- Bottom nav mobile.
- Floating buttons.
- Contenedor principal.

Props sugeridas:

- `activeSection`
- `title`
- `children`
- `user`
- `currentModule`
- `streak`
- `todayMinutes`

### Sidebar

Inspiracion Dozo:

- Fondo navy.
- Logo arriba.
- Secciones con labels:
  - APRENDER
  - PRACTICAR
  - CLASE
  - CUENTA
- Items con icono, texto, estado activo.
- Perfil abajo.
- Logout abajo.

Estilo:

- Active item con fondo semitransparente turquesa/rojo.
- Icon box pequeño.
- Texto blanco.
- Labels con opacidad baja.

Items recomendados:

- Inicio
- Kana
- Vocabulario
- Kanji
- Gramatica
- Lecturas
- Escucha
- Repaso
- Mi plan
- Tareas
- Comunidad
- Progreso

### TopStudyBar

Contenido:

- Hoy: `00:00` o minutos.
- Racha.
- Boton "Empezar".
- Boton "Ayuda" opcional.

Desktop:

- Barra horizontal blanca/crema.
- Alineada al main.

Mobile:

- Integrarla como card superior o chip row.

### AnnouncementBanner

Uso:

- Avisos de Pako.
- Tema de la semana.
- Recordatorios.

No usar trial/subscription copy.

Estilo:

- Fondo `#FDECEA` o `#D8F4F1`.
- Icono.
- Titulo corto.
- CTA opcional.
- Dismiss opcional.

### ModuleHero

Equivalente al hero de Dozo por seccion.

Contenido:

- Icono/cuadro de color.
- Titulo.
- Subtitulo.
- Progreso.
- Items por repasar o tareas pendientes.

Variantes:

- Kana.
- Vocabulario.
- Kanji.
- Lecturas.
- Escucha.
- Mi plan.
- Tareas.

### StatTile

Para:

- Progreso.
- Por revisar.
- Tareas.
- Tiempo.
- Racha.

Estilo:

- Fondo suave.
- Numero grande.
- Label pequeño.
- Radio 14-18px.

### FeatureCard

Card grande de accion, como las tarjetas de Kana Chart / Vocabulary / Phrases.

Contenido:

- Icono/kanji/kana.
- Titulo.
- Descripcion.
- Progreso opcional.

Estados:

- Active / selected.
- Disabled / coming soon.
- Completed.

### UnitListRow

Para listas de unidades de vocab/kanji/tareas.

Contenido:

- Numero o icono.
- Titulo.
- Subtitulo.
- Preview de items japoneses.
- Progreso `0/20`, `3/5`, etc.
- Chevron.

Estilo:

- Card blanca horizontal.
- Altura 64-88px.
- Hover suave.

### LearningItemCard

Para vocabulario/kanji/gramatica.

Contenido:

- Japones grande.
- Lectura.
- Significado.
- Botones:
  - Audio.
  - Mark.
  - Save.
  - Practice.

Grid desktop:

- 2 columnas.

Mobile:

- 1 columna.

### Tabs

Estilo similar a Dozo:

- Segmented control en card blanca.
- Active con gradiente o fondo turquesa/rojo.
- Labels:
  - Leccion.
  - Practica.
  - Quiz.
  - Flashcards.

### Reader

Componentes:

- ReadingHero.
- ReaderToolbar.
- ProgressBar.
- ParagraphCard.
- LineAudioButton.
- AskAboutLineButton.

Toolbar:

- A-
- px value
- A+
- Furigana ON/OFF
- Traduccion ON/OFF
- Play
- Velocidad

Paragraph card:

- Fondo crema claro.
- Japones principal.
- Furigana.
- Traduccion opcional.
- Boton audio.
- Boton preguntar.

### ListeningScene

Componentes:

- Imagen hero.
- Titulo.
- Descripcion.
- Toggles furigana/romaji/espanol.
- Dialog tabs.
- DialogueLine.

No usar imagenes genericas oscuras o abstractas. Las escenas deben ser semanticamente claras.

### TaskCard

Contenido:

- Tipo: lectura, vocabulario, proyecto, practica, entrega.
- Titulo.
- Fecha.
- Modulo.
- Estado.
- CTA.
- Feedback si existe.

Estados:

- Pendiente.
- En progreso.
- Entregada.
- Revisada.
- Vencida.

### SupportDrawer

Boton flotante:

- "Ayuda"

Drawer:

- Tabs:
  - Pregunta.
  - Problema.
  - Idea.
- Campos:
  - Actividad/pagina.
  - Fragmento.
  - Mensaje.
- CTA: Enviar.

## Estados vacios

Todos los modulos necesitan empty states:

- Sin tareas: "No tienes tareas pendientes."
- Sin repaso: "Guarda vocabulario o kanji para repasarlo despues."
- Sin lecturas: "Aun no hay lecturas para este modulo."
- Sin grupo: "Pako aun no te asigna a un grupo."

El tono debe ser amable y concreto, no comercial.

## Microcopy en español

Evitar:

- "Suscribete"
- "Trial"
- "Upgrade"
- "Marketplace"

Usar:

- "Empezar"
- "Repasar"
- "Guardar"
- "Marcar como visto"
- "Preguntar"
- "Continuar"
- "Tarea pendiente"
- "Feedback de Pako"
- "Mi plan"
- "Esta semana"

## Iconografia

Preferir:

- lucide-react si ya esta disponible o instalar si se decide.
- Si no, usar iconos simples existentes.

No usar emojis como iconos principales en UI final. Pueden aparecer en contenido educativo si ya existen, pero la interfaz debe usar iconos consistentes.

## Diferencias frente al design system actual

El design system actual dice:

- Minimal.
- One card style.
- No gradients by default.
- No dashboard chrome unless necessary.

Para esta direccion nueva, se propone ajustar:

- Si usar dashboard chrome, porque Dozo-like lo necesita.
- Si usar gradientes, pero solo en heroes/cards principales.
- Mantener cards limpias y evitar ruido.
- Mantener una base de radios/sombras consistente.

## Tokens sugeridos para implementar

```css
:root {
  --pk-bg: #FFF8E7;
  --pk-bg-soft: #FDFCF5;
  --pk-surface: #FFFFFF;
  --pk-surface-warm: #FAF3E2;
  --pk-navy: #1A1A2E;
  --pk-red: #E63946;
  --pk-teal: #4ECDC4;
  --pk-orange: #F4A261;
  --pk-blue: #457B9D;
  --pk-text: #1A1A2E;
  --pk-muted: rgba(26, 26, 46, 0.58);
  --pk-border: rgba(26, 26, 46, 0.09);
  --pk-shadow: 0 14px 40px rgba(26, 26, 46, 0.10);
  --pk-radius-sm: 10px;
  --pk-radius-md: 14px;
  --pk-radius-lg: 20px;
}
```

## Pantallas prioritarias para lograr parecido

1. Dashboard principal.
2. Kana module.
3. Vocabulario unit list.
4. Reader.
5. Mi plan / tareas.
6. Progreso.

Si esas seis se ven bien, la app se sentira nueva aunque las rutas profundas sigan migrando poco a poco.
