import { KanaQuizScreen } from "@/components/redesign/KanaQuizScreen";

export const metadata = {
  title: "Hiragana Reading Quiz | Pako Nihongo",
};

export default function HiraganaReadingQuizPage() {
  return <KanaQuizScreen script="hiragana" mode="reading" />;
}
