# Especificacion funcional: app Pako Nihongo estilo Dozo

Fecha: 2026-06-21

## Roles

### Alumno

Puede:

- Ver dashboard.
- Ver modulo actual.
- Practicar kana, vocabulario, kanji, lectura, escucha y repaso.
- Ver tareas asignadas.
- Marcar tareas como hechas o entregar evidencia cuando aplique.
- Guardar items para repasar.
- Ver progreso.
- Preguntar sobre una actividad o fragmento.

No puede ver:

- Slugs internos.
- Rubricas completas.
- Checklists internos.
- Criterios de avance internos.
- Definiciones completas de proyectos si son para planeacion docente.

### Profesor/admin

Puede:

- Ver alumnos y grupos.
- Asignar tareas.
- Cambiar modulo/grupo.
- Revisar progreso.
- Dar feedback.
- Responder preguntas contextuales.
- Publicar avisos o tema de la semana.

## Navegacion funcional

### Dashboard

Objetivo:

- Ser el centro de estudio.

Debe mostrar:

- Saludo.
- Tiempo de estudio de hoy.
- Racha.
- Modulo actual.
- CTA principal: Empezar / Continuar.
- Tareas pendientes.
- Plan de esta semana.
- Accesos a practicar.
- Aviso de Pako.
- Progreso resumido.

Datos:

- Usuario actual.
- Perfil.
- Grupo.
- Modulo actual.
- Tareas activas.
- Progreso por areas.
- Ultima actividad.
- Racha local o remota.

Estados:

- Loading.
- Sin sesion.
- Sin grupo asignado.
- Sin tareas.
- Con tareas.
- Admin viendo como alumno.

### Kana

Objetivo:

- Replicar la claridad de Dozo para hiragana/katakana, usando lo que ya existe.

Funciones:

- Ver tabla.
- Escuchar kana.
- Trazar/escribir.
- Practicar lectura.
- Quiz.
- Ver progreso por kana.
- Marcar dominio.

Estados:

- Sin progreso.
- En progreso.
- Dominado.
- Por repasar.

### Vocabulario

Objetivo:

- Convertir vocabulario Genki/curso en unidades tipo Dozo.

Jerarquia:

- Modulo -> leccion -> unidad/lista -> palabra.

Funciones:

- Lista de unidades.
- Detalle de unidad.
- Flashcards.
- Practica.
- Guardar palabra.
- Marcar palabra como conocida.
- Audio si existe.

Card de palabra:

- Japones.
- Lectura.
- Significado.
- Tags: leccion, tema.
- Botones: escuchar, guardar, marcar, practicar.

### Kanji

Objetivo:

- Dar tarjetas de kanji por leccion/unidad.

Funciones:

- Lista de unidades.
- Detalle con tarjetas.
- Quiz/practica.
- Guardar kanji.
- Marcar conocido.

Card de kanji:

- Kanji grande.
- Significado.
- Lecturas.
- Ejemplo si existe.
- Acciones.

### Gramatica guiada

Objetivo:

- Apoyar al alumno sin exponer material interno completo.

Funciones:

- Mostrar puntos visibles como "estructura de clase".
- Explicacion corta.
- Ejemplos.
- Practica simple.
- Preguntar.

No mostrar:

- Rubricas.
- Criterios internos.
- Checklists.

### Lecturas

Objetivo:

- Ser una de las pantallas estrella, equivalente al reader de Dozo.

Jerarquia:

- Catalogo -> lectura -> parrafo/linea.

Catalogo:

- Card con imagen.
- Titulo japones.
- Titulo espanol.
- Modulo.
- Nivel.
- Duracion aproximada.
- Estado: no iniciada, en progreso, leida.

Reader:

- Imagen/hero.
- Titulo.
- Controles:
  - Furigana.
  - Traduccion.
  - Tamano de letra.
  - Audio global si existe.
  - Velocidad si hay audio.
- Parrafos con:
  - Texto japones.
  - Furigana opcional.
  - Traduccion opcional.
  - Audio por parrafo opcional.
  - Preguntar sobre este parrafo.
- Progreso por parrafo.
- Guardar.
- Marcar leida.

### Escucha

Objetivo:

- Practicar dialogos situacionales de clase.

Jerarquia:

- Categoria -> topic -> dialogo -> linea.

Categorias iniciales:

- Presentarse.
- Clase.
- Rutina.
- Familia.
- Restaurante.
- Compras.
- Viaje.
- Proyectos.

Topic:

- Imagen clara de situacion.
- Descripcion.
- Dialogos.
- Toggles:
  - Furigana.
  - Romaji.
  - Espanol.
- Audio global y por linea si existe.

### Repaso

Objetivo:

- Centralizar guardados.

MVP:

- Ver items guardados.
- Filtros: vocabulario, kanji, frases, gramatica.
- Flashcard reveal.
- Botones:
  - Lo se.
  - Repasar luego.
  - Quitar guardado.

Version avanzada:

- SRS con due date.
- Due now.
- Total cards.
- Historial.

### Mi plan

Objetivo:

- Mostrar que hacer por dia/semana.

Funciones:

- Semana actual.
- Calendario mensual simple.
- Tareas por dia.
- Progreso semanal.
- Notas del alumno.
- Asignaciones del profesor.

Campos de tarea:

- Titulo.
- Tipo.
- Modulo.
- Fecha.
- Descripcion visible.
- Link a actividad.
- Estado.
- Feedback.

### Tareas

Objetivo:

- Gestionar trabajo asignado.

Estados:

- Pendiente.
- En progreso.
- Entregada.
- Revisada.
- Vencida.

Acciones alumno:

- Abrir.
- Marcar como hecha.
- Entregar texto/link/archivo si se implementa.
- Preguntar.

Acciones profesor:

- Crear.
- Asignar.
- Revisar.
- Dar feedback.
- Reabrir.

### Preguntas contextuales

Objetivo:

- Que el alumno pueda pedir ayuda sin explicar donde esta.

Campos:

- Usuario.
- Pagina/ruta.
- Actividad.
- Fragmento seleccionado.
- Pregunta.
- Estado.
- Respuesta.

Estados:

- Abierta.
- Respondida.
- Resuelta.

### Progreso

Objetivo:

- Dar una vista simple, no obsesiva.

Metricas:

- Racha.
- Tiempo estimado.
- Tareas completadas.
- Items practicados.
- Progreso por area.
- Progreso por modulo.

Vistas:

- Hoy.
- Semana.
- Mes.

## Modelo de datos sugerido

### `profiles`

Ya existe. Extender solo si hace falta:

- `current_level`
- `learning_goal`
- `daily_goal_minutes`
- `interests`

### `student_assignments`

- `id`
- `student_id`
- `group_name`
- `module_number`
- `title`
- `description_public`
- `type`
- `target_path`
- `due_date`
- `status`
- `created_by`
- `created_at`
- `updated_at`

### `student_assignment_submissions`

- `id`
- `assignment_id`
- `student_id`
- `text`
- `url`
- `status`
- `submitted_at`

### `teacher_feedback`

- `id`
- `assignment_id`
- `student_id`
- `teacher_id`
- `message`
- `created_at`

### `study_progress_events`

- `id`
- `student_id`
- `area`
- `item_type`
- `item_id`
- `action`
- `duration_seconds`
- `created_at`

### `saved_items`

- `id`
- `student_id`
- `item_type`
- `item_id`
- `payload`
- `next_review_at`
- `created_at`
- `updated_at`

### `readings`

- `id`
- `module_number`
- `title_es`
- `title_ja`
- `level`
- `summary`
- `image_url`
- `status`

### `reading_paragraphs`

- `id`
- `reading_id`
- `position`
- `text_ja`
- `furigana_data`
- `translation_es`
- `audio_url`

### `context_questions`

- `id`
- `student_id`
- `teacher_id`
- `source_type`
- `source_id`
- `source_path`
- `selected_text`
- `question`
- `answer`
- `status`
- `created_at`
- `answered_at`

## Eventos de progreso

Acciones a registrar:

- `view`
- `start`
- `complete`
- `mark_known`
- `save`
- `review_correct`
- `review_again`
- `ask_question`
- `submit_assignment`

## MVP funcional recomendado

Para primera iteracion real:

1. Dashboard nuevo.
2. Shell de navegacion.
3. Cards conectadas a rutas actuales.
4. Tareas mock o conectadas a `admin/assignments`.
5. Lecturas mock con reader real.
6. Preguntas contextuales guardadas localmente o preparadas para Supabase.

No implementar aun:

- SRS completo.
- Audio generado masivo.
- Marketplace.
- Pagos.
- Calendario avanzado.
