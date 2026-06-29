"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import IchigoHeader from "@/components/IchigoHeader";

const HIDDEN_CHROME_PREFIXES = [
  "/auth",
  "/dashboard",
  "/login",
  "/pending",
];

export default function LegacyChromeGate() {
  const pathname = usePathname();
  const hideLegacyChrome = HIDDEN_CHROME_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (hideLegacyChrome) return null;

  return (
    <>
      <IchigoHeader />
      <BottomNav />
    </>
  );
}
