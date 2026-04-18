export type ResourceItem = {
  id: string;
  title: string;
  type: "PDF" | "Enlace" | "Material";
  url: string;
};

export const MOCK_RESOURCES: ResourceItem[] = [
  {
    id: "r1",
    title: "Guía de Gramática Básica",
    type: "PDF",
    url: "#",
  },
  {
    id: "r2",
    title: "Diccionario Jisho",
    type: "Enlace",
    url: "https://jisho.org",
  },
  {
    id: "r3",
    title: "Ejercicios de Partículas",
    type: "Material",
    url: "#",
  },
  {
    id: "r4",
    title: "Kanji para Principiantes",
    type: "PDF",
    url: "#",
  },
  {
    id: "r5",
    title: "NHK News Web Easy",
    type: "Enlace",
    url: "https://www3.nhk.or.jp/news/easy/",
  },
];
