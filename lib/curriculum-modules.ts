export type CurriculumProject = {
  id: string;
  nombre: string;
  nombreJa: string;
  definicion: string;
  formato: string;
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
  competencias: string[];
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
    proyectos: [
      {
        id: "g1-a-p1",
        nombre: "Mini entrevista de presentación",
        nombreJa: "はじめまして面談",
        definicion: "El alumno y el profesor o un compañero hacen una entrevista de presentación en japonés de 3–4 minutos. Sin guión. El entrevistador hace preguntas variadas: nombre, origen, ocupación, gustos, rutina.",
        formato: "conversación Zoom",
        competencias: [
          "presentación personal",
          "interacción básica",
          "horarios",
        ],
        checklist: [
          "Responde sin leer notas",
          "Usa は/が apropiadamente",
          "Menciona horario con al menos 2 actividades",
          "Reacciona con naturalidad (へえ、そうですか…)",
        ],
      },
      {
        id: "g1-a-p2",
        nombre: "Mi día simple",
        nombreJa: "わたしの一日",
        definicion: "El alumno describe su día típico en japonés: a qué hora hace qué, dónde, y con quién. Puede usar fotos o solo voz. Máximo 2 minutos.",
        formato: "video",
        competencias: [
          "rutina diaria",
          "tiempo y lugar",
          "ubicación",
        ],
        checklist: [
          "Menciona al menos 6 actividades con hora",
          "Describe dónde está algo usando ある/いる",
          "Usa partículas correctamente (に・で・を・が)",
          "El video es espontáneo, no leído",
        ],
      },
      {
        id: "g1-a-p3",
        nombre: "Hagamos un plan",
        nombreJa: "いっしょに行きませんか",
        definicion: "En parejas o grupo pequeño, proponer un plan real o ficticio para salir: invitar, responder, negociar día y hora. 3–4 minutos.",
        formato: "conversación Zoom",
        competencias: [
          "invitaciones",
          "horarios",
          "interacción básica",
        ],
        checklist: [
          "Hace al menos 1 invitación con ませんか",
          "Propone o acepta/rechaza con razón",
          "Usa días y horas concretos",
          "La conversación fluye sin depender del profesor",
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
    proyectos: [
      {
        id: "g1-b-p1",
        nombre: "Club de recomendaciones",
        nombreJa: "おすすめ会",
        definicion: "Cada alumno recomienda algo (comida, lugar, actividad, serie) usando adjetivos y gustos. Los demás reaccionan y preguntan. 2 minutos de presentación + preguntas.",
        formato: "presentación Zoom",
        competencias: [
          "adjetivos",
          "gustos y preferencias",
          "descripción",
        ],
        checklist: [
          "Usa al menos 3 adjetivos distintos (い y な)",
          "Expresa qué le gusta y por qué",
          "Responde preguntas de los compañeros en japonés",
          "No lee directamente de notas",
        ],
      },
      {
        id: "g1-b-p2",
        nombre: "Reglas de un lugar",
        nombreJa: "この場所のルール",
        definicion: "El alumno inventa o describe las reglas de un lugar real o ficticio (casa, clase, trabajo, nave espacial…) usando forma て. Puede ser serio o gracioso.",
        formato: "presentación Zoom o video",
        competencias: [
          "forma て",
          "reglas y permisos",
          "descripción de acciones",
        ],
        checklist: [
          "Usa てください en al menos 2 reglas",
          "Usa てはいけません en al menos 2 reglas",
          "Usa てもいいです en al menos 1 regla",
          "Las reglas son coherentes con el lugar elegido",
        ],
      },
      {
        id: "g1-b-p3",
        nombre: "Misión en secuencia",
        nombreJa: "今日のミッション",
        definicion: "El alumno narra una secuencia de acciones (real o ficticia) usando forma て para conectarlas: una receta, una aventura, un día de trabajo. 2 minutos.",
        formato: "video o presentación",
        competencias: [
          "forma て",
          "secuencia de acciones",
          "acciones en progreso",
        ],
        checklist: [
          "Encadena al menos 5 acciones con forma て",
          "Describe al menos 1 acción en progreso con ている",
          "Usa propósito con に + V-masu + に行く",
          "La secuencia tiene sentido y fluye",
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
    proyectos: [
      {
        id: "g1-c-p1",
        nombre: "Reseña y reacción",
        nombreJa: "レビュー会",
        definicion: "El alumno reseña algo (película, libro, canción, lugar) usando modificación de sustantivo y opiniones. Los compañeros reaccionan y debaten. 3 minutos + preguntas.",
        formato: "presentación Zoom",
        competencias: [
          "modificación de sustantivo",
          "opiniones",
          "citas indirectas",
        ],
        checklist: [
          "Usa al menos 2 cláusulas de modificación de sustantivo",
          "Da su opinión con と思います",
          "Reporta lo que alguien dijo con と言っていました",
          "Responde preguntas de los compañeros en japonés",
        ],
      },
      {
        id: "g1-c-p2",
        nombre: "Persona o personaje importante",
        nombreJa: "大切な人・キャラ紹介",
        definicion: "El alumno presenta a alguien real o ficticio: lo describe con cláusulas de modificación, da su opinión, y cuenta algo que esa persona dijo. 2–3 minutos.",
        formato: "presentación Zoom o video",
        competencias: [
          "modificación de sustantivo",
          "descripción de personas",
          "formas cortas",
        ],
        checklist: [
          "Describe a la persona con al menos 3 cláusulas de modificación",
          "Da una opinión propia con と思います",
          "Usa formas cortas de forma natural",
          "El alumno muestra conexión real con el tema",
        ],
      },
      {
        id: "g1-c-p3",
        nombre: "Opinión y respuesta",
        nombreJa: "ミニ意見交換",
        definicion: "Debate express en grupo sobre un tema sencillo (¿qué es mejor, X o Y?). Cada alumno da su opinión, escucha la de otro, y responde. 4–5 minutos en grupo.",
        formato: "conversación Zoom",
        competencias: [
          "opiniones",
          "formas cortas",
          "interacción",
        ],
        checklist: [
          "Expresa su opinión al menos 2 veces con と思います",
          "Responde a la opinión de otro compañero",
          "Usa もう/まだ apropiadamente en al menos 1 turno",
          "Mantiene la conversación sin recurrir al español",
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
    proyectos: [
      {
        id: "g1-d-p1",
        nombre: "Plan soñado",
        nombreJa: "夢のプラン",
        definicion: "El alumno planea un viaje, proyecto de vida o meta: compara opciones, habla de lo que quiere hacer, de sus experiencias previas, y da recomendaciones. 4–5 minutos.",
        formato: "presentación Zoom",
        competencias: [
          "comparaciones",
          "planes e intenciones",
          "experiencias",
          "recomendaciones",
        ],
        checklist: [
          "Compara 2 opciones usando より o いちばん",
          "Usa つもり para hablar de planes",
          "Menciona algo que nunca ha hecho con ことがある",
          "Da al menos 1 consejo con ほうがいい",
        ],
      },
      {
        id: "g1-d-p2",
        nombre: "Consultorio de consejos",
        nombreJa: "お悩み相談室",
        definicion: "Un alumno presenta un problema (real o inventado) y los demás dan consejos usando ほうがいい, なければなりません y んです. Rotar roles. 5–6 minutos.",
        formato: "conversación Zoom",
        competencias: [
          "consejos",
          "obligaciones",
          "explicaciones con んです",
        ],
        checklist: [
          "Da al menos 2 consejos usando estructuras distintas",
          "Usa んです para contextualizar o explicar",
          "Usa なければなりません o なくてもいい correctamente",
          "Escucha y reacciona a los consejos de otros",
        ],
      },
      {
        id: "g1-d-p3",
        nombre: "Elige tu camino",
        nombreJa: "どっちを選ぶ？",
        definicion: "Se presentan dos opciones difíciles (trabajo A vs B, ciudad X o Y). Cada alumno argumenta su elección comparando, expresando deseos y experiencias. 4 minutos.",
        formato: "conversación Zoom",
        competencias: [
          "comparaciones",
          "expresar deseos",
          "experiencias pasadas",
        ],
        checklist: [
          "Usa より para comparar concretamente",
          "Expresa qué quiere hacer con たい",
          "Menciona una experiencia relevante con ことがある",
          "Da al menos 1 razón usando superlativo (いちばん)",
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
    proyectos: [
      {
        id: "g2-a-p1",
        nombre: "Lo que puedo hacer ahora",
        nombreJa: "できること発表",
        definicion: "El alumno presenta sus habilidades actuales: qué puede y no puede hacer, qué probó por primera vez, y qué quiere poder hacer pronto. 3–4 minutos.",
        formato: "presentación Zoom o video",
        competencias: [
          "forma potencial",
          "habilidades",
          "intentar cosas nuevas",
        ],
        checklist: [
          "Usa forma potencial de al menos 5 verbos distintos",
          "Describe algo que intentó por primera vez con てみた",
          "Usa し para dar múltiples razones",
          "La presentación suena espontánea, no memorizada",
        ],
      },
      {
        id: "g2-a-p2",
        nombre: "Organicemos algo",
        nombreJa: "みんなで企画しよう",
        definicion: "En grupo, planear un evento real o ficticio: cada alumno propone, acepta, prepara y hace peticiones formales. 6–8 minutos en grupo.",
        formato: "conversación Zoom",
        competencias: [
          "dar/recibir favores",
          "intenciones",
          "peticiones formales",
          "preparación anticipada",
        ],
        checklist: [
          "Hace al menos 1 petición con ていただけませんか",
          "Usa ておく para algo que preparará con anticipación",
          "Maneja あげる/くれる/もらう correctamente",
          "Contribuye activamente al plan del grupo",
        ],
      },
      {
        id: "g2-a-p3",
        nombre: "Historia de favores",
        nombreJa: "ありがとうストーリー",
        definicion: "El alumno cuenta una historia real sobre un favor que recibió o hizo usando las estructuras de dar y recibir. 2–3 minutos.",
        formato: "conversación Zoom o video",
        competencias: [
          "dar/recibir favores",
          "narrativa en pasado",
          "intercambios sociales",
        ],
        checklist: [
          "Usa もらった、くれた o あげた correctamente",
          "La historia tiene inicio, desarrollo y desenlace",
          "Usa し para dar contexto o razones",
          "Expresa cómo se sintió (だから、それで…)",
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
    proyectos: [
      {
        id: "g2-b-p1",
        nombre: "Laboratorio de historias",
        nombreJa: "ストーリー研究会",
        definicion: "El alumno narra una película, serie o libro usando condicionales para describir causas y consecuencias. Los compañeros preguntan al final. 3–4 minutos.",
        formato: "presentación Zoom",
        competencias: [
          "condicionales",
          "narrativa",
          "secuencia de eventos",
        ],
        checklist: [
          "Usa たら al menos 2 veces para eventos encadenados",
          "Usa と para consecuencias automáticas o generales",
          "Menciona algo que escuchó con そうだ",
          "Responde preguntas inesperadas en japonés",
        ],
      },
      {
        id: "g2-b-p2",
        nombre: "Si pudiera volver",
        nombreJa: "もし戻れたら",
        definicion: "El alumno habla de algo que haría diferente si pudiera volver atrás, o expresa un arrepentimiento real o ficticio usando condicionales y ばよかった. 2–3 minutos.",
        formato: "conversación Zoom",
        competencias: [
          "arrepentimiento",
          "hipótesis",
          "condicionales",
        ],
        checklist: [
          "Usa ばよかった al menos 1 vez con contenido real",
          "Usa たら o ば para plantear la hipótesis",
          "Explica el contexto con razones",
          "La reflexión suena auténtica, no mecánica",
        ],
      },
      {
        id: "g2-b-p3",
        nombre: "Escena en movimiento",
        nombreJa: "同時進行シーン",
        definicion: "En parejas, improvisar una escena donde ambos hacen cosas simultáneamente y ocurren eventos inesperados. Usar ながら, てしまう y verbos transitivos/intransitivos. 4–5 minutos.",
        formato: "roleplay Zoom",
        competencias: [
          "simultaneidad",
          "verbos transitivos/intransitivos",
          "resultado inesperado",
        ],
        checklist: [
          "Usa ながら al menos 1 vez",
          "Usa てしまう para un resultado inesperado",
          "Distingue transitivo/intransitivo correctamente",
          "El roleplay es fluido y creativo",
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
    proyectos: [
      {
        id: "g2-c-p1",
        nombre: "Entrevista formal",
        nombreJa: "フォーマル面談",
        definicion: "Roleplay de entrevista de trabajo o reunión formal. El alumno usa keigo apropiado, se presenta humildemente y responde preguntas. 5–6 minutos.",
        formato: "roleplay Zoom",
        competencias: [
          "keigo",
          "registro formal",
          "presentación personal avanzada",
        ],
        checklist: [
          "Usa al menos 3 formas honoríficas correctamente",
          "Usa al menos 2 formas humildes correctamente",
          "Se presenta con expresiones formales",
          "Responde sin romper el registro",
        ],
      },
      {
        id: "g2-c-p2",
        nombre: "Cómo he cambiado",
        nombreJa: "変わったこと",
        definicion: "El alumno reflexiona sobre cómo ha cambiado desde que empezó a estudiar japonés: qué puede hacer ahora que antes no podía. Usa ようになる y ようにする. 2–3 minutos.",
        formato: "conversación Zoom",
        competencias: [
          "cambios graduales",
          "reflexión personal",
          "voz pasiva",
        ],
        checklist: [
          "Usa ようになった al menos 2 veces para cambios",
          "Usa ようにしている para hábitos activos",
          "Menciona algo que le pasó usando pasiva",
          "El contenido es genuino y reflexivo",
        ],
      },
      {
        id: "g2-c-p3",
        nombre: "Mini mesa redonda",
        nombreJa: "ミニ座談会",
        definicion: "Discusión grupal sobre un tema real (hábitos, tecnología, cultura japonesa). Participar usando registro adecuado y expresando lo que se quiere de los demás. 6–8 minutos.",
        formato: "conversación Zoom",
        competencias: [
          "registro y cortesía",
          "deseos hacia otros",
          "participación activa",
        ],
        checklist: [
          "Usa てほしい al menos 1 vez dirigido a alguien",
          "Mantiene registro apropiado al contexto",
          "Hace al menos 2 turnos espontáneos",
          "Usa しかない correctamente en contexto",
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
    proyectos: [
      {
        id: "g2-d-p1",
        nombre: "Presentación final conversacional",
        nombreJa: "卒業トーク",
        definicion: "Presentación de 6–8 minutos sobre cualquier tema que le importe al alumno. Sin guión. El grupo hace preguntas al final. Marca el cierre del ciclo Genki.",
        formato: "presentación Zoom con preguntas",
        competencias: [
          "fluidez conversacional",
          "variedad de estructuras",
          "respuesta espontánea",
        ],
        checklist: [
          "Sostiene 6–8 minutos sin cambiar al español",
          "Responde preguntas inesperadas con seguridad",
          "Usa estructuras variadas sin fórmula visible",
          "El tema es genuinamente suyo",
        ],
      },
      {
        id: "g2-d-p2",
        nombre: "Así decido yo",
        nombreJa: "私の決め方",
        definicion: "El alumno explica cómo toma decisiones usando ことにする, y cómo establece sus propias reglas o límites. 2–3 minutos seguido de preguntas.",
        formato: "conversación Zoom",
        competencias: [
          "decisiones personales",
          "reglas propias",
          "matices",
        ],
        checklist: [
          "Usa ことにしている para reglas personales",
          "Usa ことにした para decisiones ya tomadas",
          "Usa てもいい para concesiones",
          "El contenido refleja genuinamente su forma de pensar",
        ],
      },
      {
        id: "g2-d-p3",
        nombre: "Presión, permiso y decisiones",
        nombreJa: "プレッシャーと選択",
        definicion: "Roleplay donde el alumno usa causativa para hacer que otros hagan algo, y expresa frustración o concesión con のに y てもいい. 5–6 minutos.",
        formato: "roleplay Zoom",
        competencias: [
          "causativa",
          "causativa-pasiva",
          "frustración",
          "concesiones",
        ],
        checklist: [
          "Usa causativa correctamente en al menos 2 turnos",
          "Usa のに para contraste o frustración",
          "Usa てもいい/てもかまわない para dar permiso",
          "El roleplay tiene tensión dramática real",
        ],
      }
    ],
  }
];

/**
 * Devuelve el módulo correspondiente a la última lección registrada.
 * Si no hay lección (null) o no hay match, devuelve el primer módulo.
 * Si la lección supera todos los módulos, devuelve el último.
 */
export function getCurrentCurriculumModule(
  currentLesson: number | null,
): CurriculumModule {
  if (currentLesson == null) return CURRICULUM_MODULES[0];
  const match = CURRICULUM_MODULES.find((m) =>
    m.lecciones.includes(currentLesson),
  );
  if (match) return match;
  const maxLesson = Math.max(
    ...CURRICULUM_MODULES.flatMap((m) => m.lecciones),
  );
  if (currentLesson > maxLesson) {
    return CURRICULUM_MODULES[CURRICULUM_MODULES.length - 1];
  }
  return CURRICULUM_MODULES[0];
}

/** Índice (0-based) del módulo actual dentro de CURRICULUM_MODULES. */
export function getCurriculumModuleIndex(currentLesson: number | null): number {
  const current = getCurrentCurriculumModule(currentLesson);
  return CURRICULUM_MODULES.findIndex((m) => m.id === current.id);
}

/** ¿Este módulo ya quedó completado? */
export function isCurriculumModuleCompleted(
  module: CurriculumModule,
  currentLesson: number | null,
): boolean {
  if (currentLesson == null) return false;
  const moduleMaxLesson = Math.max(...module.lecciones);
  return (
    moduleMaxLesson < currentLesson &&
    !module.lecciones.includes(currentLesson)
  );
}

/** ¿Este módulo es el módulo actual del alumno? */
export function isCurriculumModuleCurrent(
  module: CurriculumModule,
  currentLesson: number | null,
): boolean {
  return getCurrentCurriculumModule(currentLesson).id === module.id;
}

/** Búsqueda directa por id de módulo. */
export function getModuleById(id: string): CurriculumModule | undefined {
  return CURRICULUM_MODULES.find((m) => m.id === id);
}
