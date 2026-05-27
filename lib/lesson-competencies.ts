/**
 * Línea de progreso — frase motivacional por lección
 *
 * Una sola tagline por lección: qué puede hacer el alumno al completarla.
 * Tono inspirador, en segunda persona, orientado a la comunicación real.
 *
 * nivel 1 = Genki I (L1–L12)
 * nivel 2 = Genki II (L13–L23)
 */

export type LessonStop = {
  leccion: number;
  titulo: string;   // título de la lección (igual que aparece en Sensei)
  nivel: 1 | 2;
  tagline: string;  // "Ya puedes..." — una frase, motivacional
};

export const LESSON_STOPS: LessonStop[] = [
  // ── Genki I ──────────────────────────────────────────────────────────────
  { leccion: 1,  nivel: 1, titulo: "New Friends",            tagline: "Presentarte y conocer a alguien nuevo" },
  { leccion: 2,  nivel: 1, titulo: "Shopping",               tagline: "Comprar cosas y preguntar precios" },
  { leccion: 3,  nivel: 1, titulo: "Making a Date",          tagline: "Hablar de tu rutina e invitar a alguien" },
  { leccion: 4,  nivel: 1, titulo: "The First Date",         tagline: "Contar lo que hiciste y dónde están las cosas" },
  { leccion: 5,  nivel: 1, titulo: "A Trip to Okinawa",      tagline: "Describir y hablar de lo que te gusta" },
  { leccion: 6,  nivel: 1, titulo: "A Day in Robert's Life", tagline: "Pedir permiso, dar razones y hacer peticiones" },
  { leccion: 7,  nivel: 1, titulo: "Family Picture",         tagline: "Describir personas y contar lo que alguien hace" },
  { leccion: 8,  nivel: 1, titulo: "Barbecue",               tagline: "Dar tu opinión y contar lo que alguien dijo" },
  { leccion: 9,  nivel: 1, titulo: "Kabuki",                 tagline: "Describir cualquier cosa con oraciones completas" },
  { leccion: 10, nivel: 1, titulo: "Winter Vacation Plans",  tagline: "Comparar opciones y hablar de tus planes" },
  { leccion: 11, nivel: 1, titulo: "After the Vacation",     tagline: "Hablar de lo que quieres y tus experiencias" },
  { leccion: 12, nivel: 1, titulo: "At the Lost and Found",  tagline: "Dar consejos, expresar obligaciones y hacer suposiciones" },

  // ── Genki II ─────────────────────────────────────────────────────────────
  { leccion: 13, nivel: 2, titulo: "Visiting Kyoto",         tagline: "Decir lo que puedes hacer y dar múltiples razones" },
  { leccion: 14, nivel: 2, titulo: "Christmas Eve",          tagline: "Dar y recibir favores de forma natural" },
  { leccion: 15, nivel: 2, titulo: "A Trip to Nagano",       tagline: "Expresar intenciones y hacer peticiones formales" },
  { leccion: 16, nivel: 2, titulo: "Lost and Found",         tagline: "Hablar de momentos específicos y expresar esperanzas" },
  { leccion: 17, nivel: 2, titulo: "Deciding Where to Live", tagline: "Hacer condiciones y referir lo que otros dicen" },
  { leccion: 18, nivel: 2, titulo: "Night Before the Exam",  tagline: "Expresar arrepentimiento y acciones simultáneas" },
  { leccion: 19, nivel: 2, titulo: "Meeting the Boss",       tagline: "Usar keigo y expresar expectativas con respeto" },
  { leccion: 20, nivel: 2, titulo: "The New House",          tagline: "Hablar con humildad y describir cambios graduales" },
  { leccion: 21, nivel: 2, titulo: "Job Hunting",            tagline: "Hablar en voz pasiva y expresar deseos hacia otros" },
  { leccion: 22, nivel: 2, titulo: "Changing Jobs",          tagline: "Usar la forma causativa y plantear hipótesis" },
  { leccion: 23, nivel: 2, titulo: "Goodbye",                tagline: "Tomar decisiones y expresar ideas complejas con fluidez" },
];

export function getLessonStop(leccion: number): LessonStop | undefined {
  return LESSON_STOPS.find((l) => l.leccion === leccion);
}
