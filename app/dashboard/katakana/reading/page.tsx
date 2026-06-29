import { KanaQuizScreen } from "@/components/redesign/KanaQuizScreen";

export const metadata = {
  title: "Katakana Reading Quiz | Pako Nihongo",
};

export default function KatakanaReadingQuizPage() {
  return <KanaQuizScreen script="katakana" mode="reading" />;
}
