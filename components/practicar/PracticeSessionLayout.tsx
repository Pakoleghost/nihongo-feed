"use client";

type PracticeSessionLayoutProps = {
  children: React.ReactNode;
};

export default function PracticeSessionLayout({ children }: PracticeSessionLayoutProps) {
  return (
    <div
      style={{
        height: "100dvh",
        background: "#FFF8E7",
        display: "flex",
        flexDirection: "column",
        paddingTop: "max(48px, env(safe-area-inset-top, 48px))",
        paddingRight: "20px",
        paddingBottom: 0,
        paddingLeft: "20px",
        overscrollBehavior: "contain",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          margin: "0 auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
