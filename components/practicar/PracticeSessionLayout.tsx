"use client";

import { useEffect } from "react";

type PracticeSessionLayoutProps = {
  children: React.ReactNode;
  accent?: "red" | "teal";
};

export default function PracticeSessionLayout({
  children,
  accent = "teal",
}: PracticeSessionLayoutProps) {
  const accentColor = accent === "red" ? "#E63946" : "#4ECDC4";

  useEffect(() => {
    document.body.classList.add("in-session");
    return () => document.body.classList.remove("in-session");
  }, []);

  return (
    <div className="sesh-layout" style={{ "--sesh-accent": accentColor } as React.CSSProperties}>
      <div className="sesh-inner">{children}</div>
    </div>
  );
}
