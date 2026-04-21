import type { ReactNode } from "react";
import { redirect } from "next/navigation";

export default function KanaDeprecatedLayout({ children }: { children: ReactNode }) {
  void children;
  redirect("/study?view=learnkana");
}
