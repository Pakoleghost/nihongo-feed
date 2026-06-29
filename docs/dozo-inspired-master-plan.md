# Plan maestro: rediseño inspirado en Dozo para Pako Nihongo

Fecha: 2026-06-21

## Objetivo

Transformar `nihongo-feed-safe` en una app de alumnos con experiencia cercana a Dozo, pero adaptada a Pako Nihongo:

- Marca propia: navy, rojo, turquesa, crema.
- UI en español.
- Enfoque en clases reales, grupos y módulos 1-8.
- Sin marketplace, suscripciones ni venta de autoestudio masivo en la primera etapa.
- Inspiración fuerte en Dozo: sidebar, cards, progreso, lectura con controles, práctica por unidades, tareas, feedback y repaso.

## Contexto actual

App principal:

- Proyecto: `/Users/pako/Trabajo/nihongo-feed-safe`
- Stack: Next.js 16, React 19, TypeScript, Supabase, Tailwind 3/4 mix, Framer Motion.
- Fuente curricular: `/Users/pako/Trabajo/curriculum/modules.json`
- Mirror curricular: `lib/curriculum-modules.ts`
- Rutas existentes relevantes:
  - `/`
  - `/study`
  - `/kana`
  - `/practicar`
  - `/practicar/vocabulario`
  - `/practicar/kanji`
  - `/practicar/flashcards`
  - `/practicar/repaso`
  - `/progreso`
  - `/recursos`
  - `/clases`
  - `/comunidad`
  - `/profile`
  - `/admin/assignments`
  - `/admin/groups`
  - `/admin/usuarios`

Referencias:

- Mapa funcional de Dozo: `/Users/pako/Trabajo/nihongo-dozo-app-map.md`
- Marca: `/Users/pako/Trabajo/MARCA.md`
- Contexto de Claude: `/Users/pako/Trabajo/CLAUDE.md`
- Design system actual: `docs/design-system.md`
- Tokens de estudio actuales: `components/study/ds.tsx`

## Norte de producto

La app debe responder tres preguntas del alumno:

1. Que tengo que hacer hoy o esta semana?
2. Como practico lo que vimos en clase?
3. Donde puedo ver mi progreso y pedir ayuda?

La app debe responder tres preguntas del profesor:

1. Que le asigne a cada grupo/alumno?
2. Que hizo cada alumno?
3. Donde se atoraron?

## Principio de adaptacion

Dozo organiza contenido masivo por JLPT. Pako Nihongo debe organizar contenido por:

- Modulos 1-8.
- Grupos.
- Lecciones Genki/Tobira segun corresponda.
- Tareas y proyectos.
- Vocabulario, kanji, kana, lectura y escucha como practicas asociadas.

No usar slugs internos visibles. Los alumnos solo deben ver nombres de modulo, nivel, can-do, vocabulario, competencias y nombres de proyectos.

## Arquitectura objetivo

### Navegacion tipo Dozo

Desktop:

- Sidebar fija izquierda.
- Main content con ancho amplio.
- Top bar con tiempo/racha/CTA.
- Botones flotantes: ayuda y avisos.

Mobile:

- Header compacto.
- Bottom nav persistente.
- Drawer o sheet para navegacion completa.

Secciones recomendadas:

- Aprender
  - Inicio
  - Kana
  - Vocabulario
  - Kanji
  - Gramatica guiada
  - Recursos
- Practicar
  - Lecturas
  - Escucha
  - Repaso
  - Flashcards
- Clase
  - Mi plan
  - Tareas
  - Feedback
  - Comunidad
- Cuenta
  - Perfil
  - Progreso

### Rutas objetivo

No hace falta borrar rutas actuales. Se puede crear un nuevo shell y mapearlo a rutas existentes.

Propuesta:

- `/dashboard` o `/app`: pantalla principal nueva.
- `/dashboard/kana`
- `/dashboard/vocabulario`
- `/dashboard/kanji`
- `/dashboard/gramatica`
- `/dashboard/lecturas`
- `/dashboard/escucha`
- `/dashboard/repaso`
- `/dashboard/plan`
- `/dashboard/tareas`
- `/dashboard/progreso`
- `/dashboard/perfil`

Alternativa conservadora:

- Mantener rutas existentes y rediseñarlas bajo un `StudentAppShell`.

Recomendacion: empezar con shell nuevo reutilizable y migrar rutas gradualmente.

## Fases

### Fase 0: Preparacion y decision de shell

Meta: dejar claro donde vivira la experiencia Dozo-like.

Tareas:

- Crear `StudentAppShell` con sidebar/topbar/bottomnav.
- Decidir si `/study` se convierte en dashboard principal o si se crea `/dashboard`.
- Mapear rutas existentes al nuevo menu.
- Definir tokens visuales definitivos.
- Crear componentes base.

Entregable:

- Shell navegable con datos mock/reales basicos.
- No necesita todas las funciones profundas todavia.

### Fase 1: Dashboard del alumno

Meta: que al entrar el alumno sienta una app completa, clara y parecida a Dozo.

Contenido:

- Saludo.
- Tiempo de estudio hoy.
- Racha.
- Modulo actual.
- Plan de esta semana.
- Tareas pendientes.
- Boton "Empezar a estudiar".
- Cards:
  - Kana.
  - Vocabulario.
  - Kanji.
  - Lecturas.
  - Escucha.
  - Repaso.
- Banner de profesor/anuncio.

Estados:

- Con grupo asignado.
- Sin grupo.
- Sin tareas.
- Alumno nuevo.
- Admin viendo como alumno.

### Fase 2: Navegacion y cards de aprendizaje

Meta: replicar el patron Dozo de modulo -> subcards -> progreso -> accion.

Pantallas:

- Kana: tabla, quiz, escritura, progreso.
- Vocabulario: por modulo/leccion/unidad.
- Kanji: por leccion/unidad.
- Gramatica guiada: solo versiones visibles para alumnos, sin exponer documentos completos ni rubricas.

Componentes:

- ModuleHero.
- ProgressStatCard.
- LearningPathCard.
- UnitListRow.
- UnitDetailCard.
- ActionButtons: escuchar, guardar, marcar, practicar.

### Fase 3: Lecturas estilo Dozo

Meta: crear la mejor experiencia de lectura de la app.

Funciones:

- Catalogo de lecturas por modulo/leccion/nivel.
- Card con imagen real o generada, titulo, nivel y resumen.
- Reader con:
  - Furigana ON/OFF.
  - Traduccion ON/OFF.
  - Tamano A-/A+.
  - Audio global opcional.
  - Audio por linea/parrafo opcional.
  - Progreso por parrafo.
  - Guardar.
  - Marcar leido.
  - Preguntar sobre este parrafo.

Datos iniciales:

- Empezar con 3-5 lecturas propias de Modulo 1.
- Luego expandir por modulo.

### Fase 4: Escucha estilo Dozo

Meta: dialogos situacionales conectados a clases.

Funciones:

- Categorias por situacion:
  - Clase.
  - Presentaciones.
  - Familia.
  - Rutina.
  - Compras.
  - Restaurantes.
  - Viaje.
  - Proyectos.
- Topic detail con imagen, dialogos, personajes, furigana/romaji/traduccion, velocidad y audio por linea.

MVP:

- Si no hay audio real, usar la interfaz lista y dejar audio como disabled/coming soon.
- Mejor no fingir audio.

### Fase 5: Plan, tareas y feedback

Meta: hacer que la app complemente clases.

Funciones:

- Mi plan:
  - Semana actual.
  - Tareas por dia.
  - Calendario mensual simple.
  - Progreso de tareas.
- Tareas:
  - Pendientes.
  - Completadas.
  - Feedback.
  - Boton para entregar o marcar listo.
- Admin:
  - Asignar tareas a grupo/alumno.
  - Ver progreso.
  - Dar feedback.

### Fase 6: Repaso inteligente

Meta: guardar vocab/kanji/gramatica para repasar.

MVP:

- "Mis guardados" con tarjetas.
- Filtros: vocabulario, kanji, frases, gramatica.
- Practica simple: reveal / lo se / repasar despues.

Version avanzada:

- SRS real con fechas de vencimiento.
- Due now.
- Total cards.
- Historial.

### Fase 7: Preguntas contextuales

Meta: reemplazar el chat generico por dudas accionables.

Funciones:

- Boton "Preguntar" en lectura, gramatica, vocabulario, tarea.
- Formulario:
  - Pagina/actividad.
  - Fragmento seleccionado.
  - Pregunta.
- Vista profesor:
  - Dudas abiertas.
  - Responder.
  - Marcar resuelto.

### Fase 8: Pulido visual y responsive

Meta: que se sienta casi tan pulida como Dozo.

Tareas:

- Ajustar densidad, sombras, radios, tabs, banners, empty states.
- Verificar desktop y mobile.
- Revisar contraste.
- Revisar que no haya overflow.
- Crear estados skeleton/loading/error.
- Hacer screenshots comparativos con Dozo como referencia de layout, no de marca.

## Prioridad recomendada

Construir en este orden:

1. `StudentAppShell`.
2. Dashboard alumno.
3. Cards/rutas de aprendizaje.
4. Lecturas.
5. Tareas/plan.
6. Repaso.
7. Preguntas contextuales.
8. Escucha.

La razon: el shell y dashboard cambian la percepcion de toda la app de inmediato. Lecturas y tareas dan valor pedagogico rapido. Escucha y SRS profundo pueden esperar.

## Criterios de "se parece a Dozo"

Debe sentirse parecido en:

- Sidebar con secciones.
- Top bar con racha y CTA.
- Cards grandes de modulo.
- Hero por seccion.
- Progreso visible.
- Unit lists compactas.
- Tabs internas.
- Empty states amables.
- Botones de ayuda global.
- Experiencia de lectura con controles.

Debe diferenciarse en:

- Marca Pako.
- Idioma espanol.
- Curriculo por modulos 1-8.
- Relacion alumno-profesor.
- Contenido propio.
- Sin venta agresiva ni trial banners.

## Riesgos

- Copiar demasiadas secciones antes de que haya contenido real.
- Crear navegacion enorme que confunda a alumnos principiantes.
- Exponer datos de profesor que CLAUDE.md dice que no deben ver.
- Mezclar estilos actuales oscuros con la nueva superficie crema sin criterio.
- Construir SRS avanzado antes de resolver tareas y lecturas.

## Definicion de MVP

Un MVP suficiente para alumnos:

- Login existente.
- Dashboard nuevo.
- Sidebar/bottom nav nuevo.
- Modulo actual visible.
- Tareas de la semana.
- Acceso a Kana/Vocab/Kanji/Practicar/Progreso.
- Una pantalla de lecturas con 3-5 lecturas.
- Reader con furigana/traduccion/tamano.
- Guardar/marcar progreso basico.
- Panel de ayuda contextual simple.

Con eso ya habria una experiencia "tipo Dozo" pero util para clases.
