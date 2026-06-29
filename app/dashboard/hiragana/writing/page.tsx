import { KanaQuizScreen } from "@/components/redesign/KanaQuizScreen";

export const metadata = {
  title: "Hiragana Writing Quiz | Pako Nihongo",
};

export default function HiraganaWritingQuizPage() {
  return <KanaQuizScreen script="hiragana" mode="writing" />;
}
