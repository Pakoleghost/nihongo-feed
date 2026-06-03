export type CurriculumProject = {
  id: string;
  nombre: string;
  nombreJa: string;
  definicion: string;
  formato: string;
  evalTipo: "interaccion" | "produccion";
  evalNota: string;
  evalDimensiones: string[];
  competencias: string[];
  checklist: string[];
};

export type CurriculumModule = {
  id: string;
  nombre: string;
  nombreJa: string;
  nivel: 1 | 2;
  cefr: "A1" | "A2";
  jlpt: "N5" | "N4";
  lecciones: number[];
  canDo: string;
  vocabTemas: string[];
  competencias: string[];
  criteriosAvance: string[];
  proyectos: CurriculumProject[];
};

export const CURRICULUM_MODULES: CurriculumModule[] = [
  {
    id: "g1-a",
    nombre: "Primeras palabras",
    nombreJa: "はじめのことば",
    nivel: 1,
    cefr: "A1",
    jlpt: "N5",
    lecciones: [1, 2, 3],
    canDo: "Puedes presentarte, hablar de tu rutina diaria, decir a qué hora haces las cosas, describir dónde están personas y objetos, e invitar a alguien a hacer algo.",
    vocabTemas: [
      "números y precios",
      "días y horas",
      "objetos cotidianos y de clase",
      "nacionalidades y profesiones",
      "lugares de la ciudad",
      "familia y amigos cercanos",
    ],
    competencias: [
      "presentación personal",
      "rutina diaria",
      "tiempo y lugar",
      "demostrativos",
      "ubicación",
      "objetos cotidianos",
      "invitaciones",
      "horarios",
      "interacción básica",
    ],
    criteriosAvance: [
      "Se presenta en japonés completo sin leer un guión (nombre, origen, ocupación)",
      "Describe dónde está algo o alguien usando ある/いる correctamente",
      "Habla de su rutina usando al menos 5 verbos distintos con hora y día",
      "Hace y responde invitaciones con ませんか sin que se le recuerde la estructura",
    ],
    proyectos: [
      {
        id: "g1-a-p1",
        nombre: "Mini entrevista de presentación",
        nombreJa: "はじめまして面談",
        definicion: "El alumno y el profesor o un compañero hacen una entrevista de presentación en japonés de 3–4 minutos. Sin guión. El entrevistador hace preguntas variadas: nombre, origen, ocupación, gustos, rutina.",
        formato: "conversación Zoom",
        evalTipo: "interaccion",
        evalNota: "Tarea de interacción (やりとり): se evalúa solo si logras comunicarte y completar la tarea. No se penalizan errores de gramática.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento de la tarea)",
        ],
        competencias: [
          "presentación personal",
          "interacción básica",
          "horarios",
        ],
        checklist: [
          "Sostiene la entrevista sin recurrir al español",
          "Responde a todas las preguntas (nombre, origen, ocupación, gustos)",
          "Hace al menos 2 preguntas propias de vuelta",
          "Reacciona a las respuestas (へえ、そうですか、いいですね…)",
        ],
      },
      {
        id: "g1-a-p2",
        nombre: "Mi día simple",
        nombreJa: "わたしの一日",
        definicion: "El alumno describe su día típico en japonés: a qué hora hace qué, dónde, y con quién. Puede usar fotos o solo voz. Máximo 2 minutos.",
        formato: "video",
        evalTipo: "produccion",
        evalNota: "Tarea de producción (産出): se evalúa el cumplimiento de la tarea + precisión + fluidez, porque es una entrega preparada.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento)",
          "正確さ (precisión)",
          "流暢さ (fluidez)",
        ],
        competencias: [
          "rutina diaria",
          "tiempo y lugar",
          "ubicación",
        ],
        checklist: [
          "タスク遂行 · Incluye al menos 6 actividades con hora y lugar",
          "タスク遂行 · Describe dónde está algo o alguien con ある・いる",
          "正確さ · Las partículas に・で・を・が están bien usadas",
          "流暢さ · El video fluye sin pausas largas ni lectura palabra por palabra",
        ],
      },
      {
        id: "g1-a-p3",
        nombre: "Hagamos un plan",
        nombreJa: "いっしょに行きませんか",
        definicion: "En parejas o grupo pequeño, proponer un plan real o ficticio para salir: invitar, responder, negociar día y hora. 3–4 minutos.",
        formato: "conversación Zoom",
        evalTipo: "interaccion",
        evalNota: "Tarea de interacción (やりとり): se evalúa solo si logras comunicarte y completar la tarea. No se penalizan errores de gramática.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento de la tarea)",
        ],
        competencias: [
          "invitaciones",
          "horarios",
          "interacción básica",
        ],
        checklist: [
          "Logra proponer un plan y cerrarlo (día, hora, lugar)",
          "Negocia o ajusta cuando el otro propone algo distinto",
          "Acepta o rechaza con una razón comprensible",
          "La conversación avanza sin depender del profesor",
        ],
      }
    ],
  },
  {
    id: "g1-b",
    nombre: "En acción",
    nombreJa: "こうどうしよう",
    nivel: 1,
    cefr: "A1",
    jlpt: "N5",
    lecciones: [4, 5, 6],
    canDo: "Puedes describir personas y cosas con adjetivos, expresar lo que te gusta o no, conectar acciones con la forma て, pedir favores, dar permiso, y explicar lo que está pasando en este momento.",
    vocabTemas: [
      "adjetivos de tamaño, color, forma y personalidad",
      "pasatiempos y deportes",
      "comida y bebida",
      "verbos de acción cotidiana",
      "reglas del hogar y la escuela",
    ],
    competencias: [
      "forma て",
      "permisos",
      "prohibiciones",
      "peticiones",
      "adjetivos",
      "gustos",
      "razones",
      "descripción",
      "secuencia de acciones",
      "movimiento con propósito",
    ],
    criteriosAvance: [
      "Describe 3 cosas distintas usando adjetivos い y な sin confundir la conjugación",
      "Encadena al menos 3 acciones con forma て sin pausas largas",
      "Distingue てください / てもいい / てはいけません en contexto sin que se le indique cuál usar",
      "Describe lo que alguien está haciendo ahora mismo usando ている de forma espontánea",
    ],
    proyectos: [
      {
        id: "g1-b-p1",
        nombre: "Club de recomendaciones",
        nombreJa: "おすすめ会",
        definicion: "Cada alumno recomienda algo (comida, lugar, actividad, serie) usando adjetivos y gustos. Los demás reaccionan y preguntan. 2 minutos de presentación + preguntas.",
        formato: "presentación Zoom",
        evalTipo: "produccion",
        evalNota: "Tarea de producción (産出): se evalúa el cumplimiento de la tarea + precisión + fluidez, porque es una entrega preparada.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento)",
          "正確さ (precisión)",
          "流暢さ (fluidez)",
        ],
        competencias: [
          "adjetivos",
          "gustos y preferencias",
          "descripción",
        ],
        checklist: [
          "タスク遂行 · Recomienda algo con al menos 3 adjetivos distintos",
          "タスク遂行 · Explica por qué lo recomienda (gustos / razones)",
          "正確さ · Conjuga adjetivos い y な correctamente",
          "流暢さ · Presenta con ritmo natural y responde preguntas",
        ],
      },
      {
        id: "g1-b-p2",
        nombre: "Reglas de un lugar",
        nombreJa: "この場所のルール",
        definicion: "El alumno inventa o describe las reglas de un lugar real o ficticio (casa, clase, trabajo, nave espacial…) usando forma て. Puede ser serio o gracioso.",
        formato: "presentación Zoom o video",
        evalTipo: "produccion",
        evalNota: "Tarea de producción (産出): se evalúa el cumplimiento de la tarea + precisión + fluidez, porque es una entrega preparada.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento)",
          "正確さ (precisión)",
          "流暢さ (fluidez)",
        ],
        competencias: [
          "forma て",
          "reglas y permisos",
          "descripción de acciones",
        ],
        checklist: [
          "タスク遂行 · Presenta al menos 4 reglas coherentes con el lugar",
          "タスク遂行 · Mezcla permisos (てもいい) y prohibiciones (てはいけません)",
          "正確さ · La forma て está bien formada",
          "流暢さ · Las reglas se presentan con fluidez, no leídas",
        ],
      },
      {
        id: "g1-b-p3",
        nombre: "Misión en secuencia",
        nombreJa: "今日のミッション",
        definicion: "El alumno narra una secuencia de acciones (real o ficticia) usando forma て para conectarlas: una receta, una aventura, un día de trabajo. 2 minutos.",
        formato: "video o presentación",
        evalTipo: "produccion",
        evalNota: "Tarea de producción (産出): se evalúa el cumplimiento de la tarea + precisión + fluidez, porque es una entrega preparada.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento)",
          "正確さ (precisión)",
          "流暢さ (fluidez)",
        ],
        competencias: [
          "forma て",
          "secuencia de acciones",
          "acciones en progreso",
        ],
        checklist: [
          "タスク遂行 · Encadena al menos 5 acciones en secuencia",
          "タスク遂行 · Incluye al menos 1 acción en progreso (ている)",
          "正確さ · Las conexiones con forma て están bien hechas",
          "流暢さ · La narración fluye y se entiende la secuencia",
        ],
      }
    ],
  },
  {
    id: "g1-c",
    nombre: "Tu voz",
    nombreJa: "じぶんのこえ",
    nivel: 1,
    cefr: "A1",
    jlpt: "N5",
    lecciones: [7, 8, 9],
    canDo: "Puedes hablar de tu familia y personas cercanas, dar tu opinión sobre temas cotidianos, reportar lo que alguien dijo, y describir cosas, lugares o personas usando oraciones completas como modificadores.",
    vocabTemas: [
      "familia y relaciones",
      "medios de comunicación (películas, música, libros)",
      "restaurantes y lugares de ocio",
      "estados de ánimo y preferencias",
    ],
    competencias: [
      "opinión",
      "citas",
      "modificación de sustantivo",
      "descripción de personas",
      "acciones habituales",
      "modificadores",
      "opinión escrita",
      "interacción",
      "formas cortas/largas",
    ],
    criteriosAvance: [
      "Usa al menos 2 cláusulas de modificación de sustantivo sin preparación previa",
      "Expresa y defiende una opinión con と思います cuando se le cuestiona",
      "Reporta lo que otra persona dijo usando と言っていました en conversación real",
      "Alterna entre formas largas y cortas apropiadamente según el contexto",
    ],
    proyectos: [
      {
        id: "g1-c-p1",
        nombre: "Reseña y reacción",
        nombreJa: "レビュー会",
        definicion: "El alumno reseña algo (película, libro, canción, lugar) usando modificación de sustantivo y opiniones. Los compañeros reaccionan y debaten. 3 minutos + preguntas.",
        formato: "presentación Zoom",
        evalTipo: "produccion",
        evalNota: "Tarea de producción (産出): se evalúa el cumplimiento de la tarea + precisión + fluidez, porque es una entrega preparada.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento)",
          "正確さ (precisión)",
          "流暢さ (fluidez)",
        ],
        competencias: [
          "modificación de sustantivo",
          "opiniones",
          "citas indirectas",
        ],
        checklist: [
          "タスク遂行 · Reseña con al menos 2 cláusulas de modificación de sustantivo",
          "タスク遂行 · Da opinión propia (と思います) y responde 1 pregunta",
          "正確さ · Las cláusulas de modificación están bien construidas",
          "流暢さ · La reseña fluye sin lectura palabra por palabra",
        ],
      },
      {
        id: "g1-c-p2",
        nombre: "Persona o personaje importante",
        nombreJa: "大切な人・キャラ紹介",
        definicion: "El alumno presenta a alguien real o ficticio: lo describe con cláusulas de modificación, da su opinión, y cuenta algo que esa persona dijo. 2–3 minutos.",
        formato: "presentación Zoom o video",
        evalTipo: "produccion",
        evalNota: "Tarea de producción (産出): se evalúa el cumplimiento de la tarea + precisión + fluidez, porque es una entrega preparada.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento)",
          "正確さ (precisión)",
          "流暢さ (fluidez)",
        ],
        competencias: [
          "modificación de sustantivo",
          "descripción de personas",
          "formas cortas",
        ],
        checklist: [
          "タスク遂行 · Describe a la persona con al menos 3 cláusulas de modificación",
          "タスク遂行 · Incluye acciones habituales y una opinión",
          "正確さ · Formas cortas y modificación bien usadas",
          "流暢さ · Habla con conexión real al tema y ritmo natural",
        ],
      },
      {
        id: "g1-c-p3",
        nombre: "Opinión y respuesta",
        nombreJa: "ミニ意見交換",
        definicion: "Debate express en grupo sobre un tema sencillo (¿qué es mejor, X o Y?). Cada alumno da su opinión, escucha la de otro, y responde. 4–5 minutos en grupo.",
        formato: "conversación Zoom",
        evalTipo: "interaccion",
        evalNota: "Tarea de interacción (やりとり): se evalúa solo si logras comunicarte y completar la tarea. No se penalizan errores de gramática.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento de la tarea)",
        ],
        competencias: [
          "opiniones",
          "formas cortas",
          "interacción",
        ],
        checklist: [
          "Expresa su opinión de forma comprensible",
          "Responde a la opinión de otro compañero (acuerdo / desacuerdo / pregunta)",
          "Sostiene al menos 2 turnos de ida y vuelta",
          "Mantiene la interacción en japonés",
        ],
      }
    ],
  },
  {
    id: "g1-d",
    nombre: "Miras hacia adelante",
    nombreJa: "これからのこと",
    nivel: 1,
    cefr: "A1",
    jlpt: "N5",
    lecciones: [10, 11, 12],
    canDo: "Puedes comparar opciones y explicar cuál prefieres y por qué, hablar de planes e intenciones, contar experiencias pasadas, dar consejos, y expresar obligaciones o lo que alguien debería hacer.",
    vocabTemas: [
      "viajes y turismo",
      "planes de vida y metas",
      "salud y bienestar",
      "situaciones cotidianas que requieren consejo",
      "experiencias nuevas y bucket list",
    ],
    competencias: [
      "comparaciones",
      "planes",
      "experiencias",
      "deseos",
      "consejos",
      "obligación",
      "explicación con んです",
      "pasado",
      "comparación",
      "cambio personal",
    ],
    criteriosAvance: [
      "Compara dos opciones usando より / いちばん con razones concretas sin titubear",
      "Habla de planes usando つもり y de deseos usando たい sin confundirlos",
      "Cuenta algo que nunca ha hecho pero quiere hacer usando ことがある",
      "Da un consejo completo usando ほうがいい y explica la razón con んです",
    ],
    proyectos: [
      {
        id: "g1-d-p1",
        nombre: "Plan soñado",
        nombreJa: "夢のプラン",
        definicion: "El alumno planea un viaje, proyecto de vida o meta: compara opciones, habla de lo que quiere hacer, de sus experiencias previas, y da recomendaciones. 4–5 minutos.",
        formato: "presentación Zoom",
        evalTipo: "produccion",
        evalNota: "Tarea de producción (産出): se evalúa el cumplimiento de la tarea + precisión + fluidez, porque es una entrega preparada.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento)",
          "正確さ (precisión)",
          "流暢さ (fluidez)",
        ],
        competencias: [
          "comparaciones",
          "planes e intenciones",
          "experiencias",
          "recomendaciones",
        ],
        checklist: [
          "タスク遂行 · Compara 2 opciones y explica una intención (つもり)",
          "タスク遂行 · Menciona una experiencia (ことがある) y un consejo (ほうがいい)",
          "正確さ · Comparativos y つもり bien formados",
          "流暢さ · La presentación fluye y se sostiene 4–5 minutos",
        ],
      },
      {
        id: "g1-d-p2",
        nombre: "Consultorio de consejos",
        nombreJa: "お悩み相談室",
        definicion: "Un alumno presenta un problema (real o inventado) y los demás dan consejos usando ほうがいい, なければなりません y んです. Rotar roles. 5–6 minutos.",
        formato: "conversación Zoom",
        evalTipo: "interaccion",
        evalNota: "Tarea de interacción (やりとり): se evalúa solo si logras comunicarte y completar la tarea. No se penalizan errores de gramática.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento de la tarea)",
        ],
        competencias: [
          "consejos",
          "obligaciones",
          "explicaciones con んです",
        ],
        checklist: [
          "Da consejos comprensibles al problema planteado",
          "Reacciona a los consejos de los demás",
          "Pregunta por más detalles cuando hace falta",
          "Mantiene el intercambio activo en grupo, en japonés",
        ],
      },
      {
        id: "g1-d-p3",
        nombre: "Elige tu camino",
        nombreJa: "どっちを選ぶ？",
        definicion: "Se presentan dos opciones difíciles (trabajo A vs B, ciudad X o Y). Cada alumno argumenta su elección comparando, expresando deseos y experiencias. 4 minutos.",
        formato: "conversación Zoom",
        evalTipo: "interaccion",
        evalNota: "Tarea de interacción (やりとり): se evalúa solo si logras comunicarte y completar la tarea. No se penalizan errores de gramática.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento de la tarea)",
        ],
        competencias: [
          "comparaciones",
          "expresar deseos",
          "experiencias pasadas",
        ],
        checklist: [
          "Defiende su elección con razones comprensibles",
          "Compara las dos opciones de forma clara",
          "Responde cuando alguien cuestiona su elección",
          "Sostiene el intercambio sin recurrir al español",
        ],
      }
    ],
  },
  {
    id: "g2-a",
    nombre: "Posibilidades",
    nombreJa: "できること",
    nivel: 2,
    cefr: "A2",
    jlpt: "N4",
    lecciones: [13, 14, 15],
    canDo: "Puedes hablar de lo que eres capaz de hacer, dar múltiples razones, manejar intercambios de dar y recibir favores de forma natural, y expresar intenciones y preparativos para el futuro.",
    vocabTemas: [
      "habilidades y talentos",
      "regalos y favores sociales",
      "planes y preparativos",
      "peticiones formales y cotidianas",
      "verbos de movimiento con propósito",
    ],
    competencias: [
      "volicional",
      "preparación",
      "peticiones formales",
      "potencial",
      "てみる",
      "razones múltiples",
      "あげる/くれる/もらう",
      "favores",
      "gratitud",
    ],
    criteriosAvance: [
      "Usa verbos en forma potencial de forma fluida, incluyendo irregulares",
      "Da múltiples razones con し...し sin necesitar que se le recuerde la estructura",
      "Maneja あげる/くれる/もらう correctamente según la dirección del intercambio",
      "Distingue ておく (preparación anticipada) de てみる (probar algo nuevo) en contexto",
    ],
    proyectos: [
      {
        id: "g2-a-p1",
        nombre: "Lo que puedo hacer ahora",
        nombreJa: "できること発表",
        definicion: "El alumno presenta sus habilidades actuales: qué puede y no puede hacer, qué probó por primera vez, y qué quiere poder hacer pronto. 3–4 minutos.",
        formato: "presentación Zoom o video",
        evalTipo: "produccion",
        evalNota: "Tarea de producción (産出): se evalúa el cumplimiento de la tarea + precisión + fluidez, porque es una entrega preparada.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento)",
          "正確さ (precisión)",
          "流暢さ (fluidez)",
        ],
        competencias: [
          "forma potencial",
          "habilidades",
          "intentar cosas nuevas",
        ],
        checklist: [
          "タスク遂行 · Describe habilidades con al menos 5 verbos en potencial",
          "タスク遂行 · Menciona algo que intentó (てみた) y da razones (し)",
          "正確さ · Forma potencial bien conjugada, incluso irregulares",
          "流暢さ · La presentación es espontánea, no memorizada",
        ],
      },
      {
        id: "g2-a-p2",
        nombre: "Organicemos algo",
        nombreJa: "みんなで企画しよう",
        definicion: "En grupo, planear un evento real o ficticio: cada alumno propone, acepta, prepara y hace peticiones formales. 6–8 minutos en grupo.",
        formato: "conversación Zoom",
        evalTipo: "interaccion",
        evalNota: "Tarea de interacción (やりとり): se evalúa solo si logras comunicarte y completar la tarea. No se penalizan errores de gramática.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento de la tarea)",
        ],
        competencias: [
          "dar/recibir favores",
          "intenciones",
          "peticiones formales",
          "preparación anticipada",
        ],
        checklist: [
          "Contribuye con al menos una propuesta al plan del grupo",
          "Hace o responde una petición dentro de la conversación",
          "Reacciona y construye sobre lo que dicen los demás",
          "El grupo llega a un plan concreto",
        ],
      },
      {
        id: "g2-a-p3",
        nombre: "Historia de favores",
        nombreJa: "ありがとうストーリー",
        definicion: "El alumno cuenta una historia real sobre un favor que recibió o hizo usando las estructuras de dar y recibir. 2–3 minutos.",
        formato: "conversación Zoom o video",
        evalTipo: "produccion",
        evalNota: "Tarea de producción (産出): se evalúa el cumplimiento de la tarea + precisión + fluidez, porque es una entrega preparada.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento)",
          "正確さ (precisión)",
          "流暢さ (fluidez)",
        ],
        competencias: [
          "dar/recibir favores",
          "narrativa en pasado",
          "intercambios sociales",
        ],
        checklist: [
          "タスク遂行 · Cuenta un favor con dirección social correcta (あげる/くれる/もらう)",
          "タスク遂行 · La historia tiene inicio, desarrollo y desenlace",
          "正確さ · Las estructuras de dar y recibir están bien usadas",
          "流暢さ · La narración fluye y transmite la emoción",
        ],
      }
    ],
  },
  {
    id: "g2-b",
    nombre: "Si y cuando",
    nombreJa: "もしもの話",
    nivel: 2,
    cefr: "A2",
    jlpt: "N4",
    lecciones: [16, 17, 18],
    canDo: "Puedes plantear condiciones e hipótesis, transmitir información de segunda mano, narrar eventos en secuencia con matices, y expresar arrepentimiento o resultados inesperados.",
    vocabTemas: [
      "noticias y rumores",
      "estados emocionales",
      "situaciones hipotéticas",
      "verbos transitivos e intransitivos",
      "expresiones de resultado y consecuencia",
    ],
    competencias: [
      "condicionales",
      "hearsay",
      "consecuencias",
      "arrepentimiento",
      "ばよかった",
      "hipótesis",
      "ながら",
      "transitivo/intransitivo",
      "emociones",
    ],
    criteriosAvance: [
      "Usa たら, と y ば para tipos de condición distintos sin mezclarlos arbitrariamente",
      "Reporta información de segunda mano con そうだ (伝聞) de forma espontánea",
      "Expresa arrepentimiento con ばよかった en un contexto real, no forzado",
      "Distingue verbos transitivos e intransitivos y los usa correctamente en contexto",
    ],
    proyectos: [
      {
        id: "g2-b-p1",
        nombre: "Laboratorio de historias",
        nombreJa: "ストーリー研究会",
        definicion: "El alumno narra una película, serie o libro usando condicionales para describir causas y consecuencias. Los compañeros preguntan al final. 3–4 minutos.",
        formato: "presentación Zoom",
        evalTipo: "produccion",
        evalNota: "Tarea de producción (産出): se evalúa el cumplimiento de la tarea + precisión + fluidez, porque es una entrega preparada.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento)",
          "正確さ (precisión)",
          "流暢さ (fluidez)",
        ],
        competencias: [
          "condicionales",
          "narrativa",
          "secuencia de eventos",
        ],
        checklist: [
          "タスク遂行 · Narra con condicionales (たら／と) causas y consecuencias",
          "タスク遂行 · Incluye información de oído (そうだ) y responde preguntas",
          "正確さ · Los condicionales están bien diferenciados",
          "流暢さ · La narración se sostiene y fluye",
        ],
      },
      {
        id: "g2-b-p2",
        nombre: "Si pudiera volver",
        nombreJa: "もし戻れたら",
        definicion: "El alumno habla de algo que haría diferente si pudiera volver atrás, o expresa un arrepentimiento real o ficticio usando condicionales y ばよかった. 2–3 minutos.",
        formato: "conversación Zoom",
        evalTipo: "interaccion",
        evalNota: "Tarea de interacción (やりとり): se evalúa solo si logras comunicarte y completar la tarea. No se penalizan errores de gramática.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento de la tarea)",
        ],
        competencias: [
          "arrepentimiento",
          "hipótesis",
          "condicionales",
        ],
        checklist: [
          "Plantea una situación pasada comprensible",
          "Expresa qué cambiaría y por qué",
          "Responde a las preguntas o reacciones del grupo",
          "Sostiene la reflexión en japonés",
        ],
      },
      {
        id: "g2-b-p3",
        nombre: "Escena en movimiento",
        nombreJa: "同時進行シーン",
        definicion: "En parejas, improvisar una escena donde ambos hacen cosas simultáneamente y ocurren eventos inesperados. Usar ながら, てしまう y verbos transitivos/intransitivos. 4–5 minutos.",
        formato: "roleplay Zoom",
        evalTipo: "interaccion",
        evalNota: "Tarea de interacción (やりとり): se evalúa solo si logras comunicarte y completar la tarea. No se penalizan errores de gramática.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento de la tarea)",
        ],
        competencias: [
          "simultaneidad",
          "verbos transitivos/intransitivos",
          "resultado inesperado",
        ],
        checklist: [
          "Improvisa la escena sin guión escrito",
          "Reacciona en tiempo real a lo que hace la pareja",
          "Logra comunicar acciones simultáneas y un giro inesperado",
          "Mantiene el roleplay en japonés de principio a fin",
        ],
      }
    ],
  },
  {
    id: "g2-c",
    nombre: "Con conciencia",
    nombreJa: "ていねいに話す",
    nivel: 2,
    cefr: "A2",
    jlpt: "N4",
    lecciones: [19, 20, 21],
    canDo: "Puedes ajustar tu nivel de formalidad según el contexto, agradecer y pedir de forma apropiada en situaciones formales, describir cambios graduales, y hablar de situaciones donde algo te pasa o haces que alguien haga algo.",
    vocabTemas: [
      "lenguaje de trabajo y situaciones formales",
      "agradecimientos y cortesía avanzada",
      "cambios y evoluciones personales",
      "problemas sociales y relaciones de poder",
    ],
    competencias: [
      "keigo",
      "humildad",
      "registro formal",
      "ようになる",
      "ようにする",
      "definiciones",
      "pasiva",
      "てほしい",
      "argumentación",
    ],
    criteriosAvance: [
      "Usa al menos 3 formas honoríficas y 2 humildes correctamente en un contexto simulado",
      "Describe cambios graduales con ようになる y ようにする sin que se le indique",
      "Usa la voz pasiva espontáneamente para describir lo que le pasó a alguien",
      "Expresa lo que quiere que otros hagan con てほしい distinguiéndolo de たい",
    ],
    proyectos: [
      {
        id: "g2-c-p1",
        nombre: "Entrevista formal",
        nombreJa: "フォーマル面談",
        definicion: "Roleplay de entrevista de trabajo o reunión formal. El alumno usa keigo apropiado, se presenta humildemente y responde preguntas. 5–6 minutos.",
        formato: "roleplay Zoom",
        evalTipo: "interaccion",
        evalNota: "Tarea de interacción (やりとり): se evalúa solo si logras comunicarte y completar la tarea. No se penalizan errores de gramática.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento de la tarea)",
        ],
        competencias: [
          "keigo",
          "registro formal",
          "presentación personal avanzada",
        ],
        checklist: [
          "Sostiene el registro formal durante toda la entrevista",
          "Responde a todas las preguntas del entrevistador",
          "Hace preguntas o peticiones apropiadas al contexto",
          "No rompe el roleplay para cambiar al español",
        ],
      },
      {
        id: "g2-c-p2",
        nombre: "Cómo he cambiado",
        nombreJa: "変わったこと",
        definicion: "El alumno reflexiona sobre cómo ha cambiado desde que empezó a estudiar japonés: qué puede hacer ahora que antes no podía. Usa ようになる y ようにする. 2–3 minutos.",
        formato: "conversación Zoom",
        evalTipo: "interaccion",
        evalNota: "Tarea de interacción (やりとり): se evalúa solo si logras comunicarte y completar la tarea. No se penalizan errores de gramática.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento de la tarea)",
        ],
        competencias: [
          "cambios graduales",
          "reflexión personal",
          "voz pasiva",
        ],
        checklist: [
          "Comunica al menos 2 cambios personales de forma comprensible",
          "Responde a las preguntas del grupo sobre sus cambios",
          "Sostiene la conversación con ida y vuelta",
          "Mantiene el intercambio en japonés",
        ],
      },
      {
        id: "g2-c-p3",
        nombre: "Mini mesa redonda",
        nombreJa: "ミニ座談会",
        definicion: "Discusión grupal sobre un tema real (hábitos, tecnología, cultura japonesa). Participar usando registro adecuado y expresando lo que se quiere de los demás. 6–8 minutos.",
        formato: "conversación Zoom",
        evalTipo: "interaccion",
        evalNota: "Tarea de interacción (やりとり): se evalúa solo si logras comunicarte y completar la tarea. No se penalizan errores de gramática.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento de la tarea)",
        ],
        competencias: [
          "registro y cortesía",
          "deseos hacia otros",
          "participación activa",
        ],
        checklist: [
          "Hace al menos 2 intervenciones espontáneas",
          "Responde y construye sobre lo que dicen los demás",
          "Expresa lo que le gustaría que otros hicieran o pensaran",
          "Mantiene un registro apropiado al grupo",
        ],
      }
    ],
  },
  {
    id: "g2-d",
    nombre: "La línea de llegada",
    nombreJa: "ゴールへ",
    nivel: 2,
    cefr: "A2",
    jlpt: "N4",
    lecciones: [22, 23],
    canDo: "Puedes hacer que otros hagan cosas, expresar concesiones y matices complejos, tomar decisiones y explicar tus reglas personales, y sostener una conversación en japonés sobre un tema que te importa.",
    vocabTemas: [
      "decisiones de vida y valores personales",
      "dinámicas de grupo y responsabilidad",
      "expresiones de fluidez conversacional",
      "vocabulario personal y de identidad",
    ],
    competencias: [
      "fluidez",
      "síntesis",
      "respuesta espontánea",
      "decisiones",
      "concesión",
      "matices",
      "causativa",
      "causativa-pasiva",
      "responsabilidad",
    ],
    criteriosAvance: [
      "Usa la causativa para hacer que alguien haga algo (autoridad, permiso, petición) con naturalidad",
      "Usa のに para expresar frustración o contraste sin que se le sugiera la estructura",
      "Sostiene una conversación de 5+ minutos sobre un tema elegido por él sin recurrir al español",
      "Responde preguntas inesperadas del grupo o del profesor sin pausas largas",
    ],
    proyectos: [
      {
        id: "g2-d-p1",
        nombre: "Presentación final conversacional",
        nombreJa: "卒業トーク",
        definicion: "Presentación de 6–8 minutos sobre cualquier tema que le importe al alumno. Sin guión. El grupo hace preguntas al final. Marca el cierre del ciclo Genki.",
        formato: "presentación Zoom con preguntas",
        evalTipo: "produccion",
        evalNota: "Tarea de producción (産出): se evalúa el cumplimiento de la tarea + precisión + fluidez, porque es una entrega preparada.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento)",
          "正確さ (precisión)",
          "流暢さ (fluidez)",
        ],
        competencias: [
          "fluidez conversacional",
          "variedad de estructuras",
          "respuesta espontánea",
        ],
        checklist: [
          "タスク遂行 · Sostiene 6–8 min sobre un tema propio sin cambiar al español",
          "タスク遂行 · Responde preguntas inesperadas del grupo",
          "正確さ · Usa una variedad de estructuras bien formadas",
          "流暢さ · El ritmo es natural y la presentación se siente propia",
        ],
      },
      {
        id: "g2-d-p2",
        nombre: "Así decido yo",
        nombreJa: "私の決め方",
        definicion: "El alumno explica cómo toma decisiones usando ことにする, y cómo establece sus propias reglas o límites. 2–3 minutos seguido de preguntas.",
        formato: "conversación Zoom",
        evalTipo: "interaccion",
        evalNota: "Tarea de interacción (やりとり): se evalúa solo si logras comunicarte y completar la tarea. No se penalizan errores de gramática.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento de la tarea)",
        ],
        competencias: [
          "decisiones personales",
          "reglas propias",
          "matices",
        ],
        checklist: [
          "Explica cómo toma decisiones de forma comprensible",
          "Da ejemplos reales que apoyan lo que dice",
          "Responde a las preguntas del grupo",
          "Sostiene el intercambio en japonés",
        ],
      },
      {
        id: "g2-d-p3",
        nombre: "Presión, permiso y decisiones",
        nombreJa: "プレッシャーと選択",
        definicion: "Roleplay donde el alumno usa causativa para hacer que otros hagan algo, y expresa frustración o concesión con のに y てもいい. 5–6 minutos.",
        formato: "roleplay Zoom",
        evalTipo: "interaccion",
        evalNota: "Tarea de interacción (やりとり): se evalúa solo si logras comunicarte y completar la tarea. No se penalizan errores de gramática.",
        evalDimensiones: [
          "タスク遂行 (cumplimiento de la tarea)",
        ],
        competencias: [
          "causativa",
          "causativa-pasiva",
          "frustración",
          "concesiones",
        ],
        checklist: [
          "Sostiene el roleplay con tensión dramática real",
          "Reacciona en tiempo real a la presión o permiso de la pareja",
          "Llega a una decisión final dentro de la escena",
          "Mantiene el roleplay en japonés",
        ],
      }
    ],
  }
];

export function getCurrentCurriculumModule(currentLesson: number | null): CurriculumModule {
  if (currentLesson == null) return CURRICULUM_MODULES[0];
  const match = CURRICULUM_MODULES.find((m) => m.lecciones.includes(currentLesson));
  if (match) return match;
  const maxLesson = Math.max(...CURRICULUM_MODULES.flatMap((m) => m.lecciones));
  if (currentLesson > maxLesson) return CURRICULUM_MODULES[CURRICULUM_MODULES.length - 1];
  return CURRICULUM_MODULES[0];
}

export function getCurriculumModuleIndex(currentLesson: number | null): number {
  const current = getCurrentCurriculumModule(currentLesson);
  return CURRICULUM_MODULES.findIndex((m) => m.id === current.id);
}

export function isCurriculumModuleCompleted(module: CurriculumModule, currentLesson: number | null): boolean {
  if (currentLesson == null) return false;
  const moduleMaxLesson = Math.max(...module.lecciones);
  return moduleMaxLesson < currentLesson && !module.lecciones.includes(currentLesson);
}

export function isCurriculumModuleCurrent(module: CurriculumModule, currentLesson: number | null): boolean {
  return getCurrentCurriculumModule(currentLesson).id === module.id;
}

export function getModuleById(id: string): CurriculumModule | undefined {
  return CURRICULUM_MODULES.find((m) => m.id === id);
}
