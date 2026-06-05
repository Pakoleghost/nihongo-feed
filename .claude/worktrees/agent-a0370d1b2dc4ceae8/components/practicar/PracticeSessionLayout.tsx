"use client";

type PracticeSessionLayoutProps = {
  children: React.ReactNode;
};

export default function PracticeSessionLayout({ children }: PracticeSessionLayoutProps) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.72) 0%, rgba(255,248,231,0.98) 34%, #FFF8E7 100%)",
        display: "flex",
        flexDirection: "column",
        paddingTop: "max(10px, env(safe-area-inset-top))",
        paddingRight: "18px",
        paddingBottom: "max(20px, calc(env(safe-area-inset-bottom) + 20px))",
        paddingLeft: "18px",
        overscrollBehavior: "contain",
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
