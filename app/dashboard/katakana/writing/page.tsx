import { KanaQuizScreen } from "@/components/redesign/KanaQuizScreen";

export const metadata = {
  title: "Katakana Writing Quiz | Pako Nihongo",
};

export default function KatakanaWritingQuizPage() {
  return <KanaQuizScreen script="katakana" mode="writing" />;
}
