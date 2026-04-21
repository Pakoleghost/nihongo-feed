"use client";

import KanjiQuizScreen from "@/components/practicar/KanjiQuizScreen";

export default function KanjiPage() {
  return (
    <KanjiQuizScreen
      initialType="kanji"
      allowTypeToggle={false}
      activityLabel="Kanji"
      activityPath="/practicar/kanji"
    />
  );
}
