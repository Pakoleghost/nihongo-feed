"use client";

type PracticeSessionLayoutProps = {
  children: React.ReactNode;
  accent?: "red" | "teal";
};

export default function PracticeSessionLayout({
  children,
  accent = "teal",
}: PracticeSessionLayoutProps) {
  const accentColor = accent === "red" ? "#E63946" : "#4ECDC4";
  return (
    <div className="sesh-layout" style={{ "--sesh-accent": accentColor } as React.CSSProperties}>
      <div className="sesh-inner">{children}</div>
    </div>
  );
}
