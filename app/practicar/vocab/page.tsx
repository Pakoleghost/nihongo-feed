"use client";

import KanjiQuizScreen from "@/components/practicar/KanjiQuizScreen";

export default function VocabPage() {
  return (
    <KanjiQuizScreen
      initialType="vocab"
      allowTypeToggle
      activityLabel="Vocab y Kanji"
      activityPath="/practicar/vocab"
    />
  );
}
