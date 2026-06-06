import "./globals.css";
import { Noto_Sans_JP, Noto_Serif_JP, Plus_Jakarta_Sans, Poppins, Zen_Kaku_Gothic_New } from "next/font/google";
import type { Viewport } from "next";
import Script from "next/script";
import PushInit from "@/components/PushInit";
import StudentViewBanner from "@/components/StudentViewBanner";
import BottomNav from "@/components/BottomNav";
import IchigoHeader from "@/components/IchigoHeader";

const noto = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

const notoSerif = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-noto-serif-jp",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-latin",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-study",
});

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  display: "swap",
  variable: "--font-zen-kaku",
});

export const metadata = {
  title: "フィード",
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${poppins.variable} ${jakarta.variable} ${noto.variable} ${notoSerif.variable} ${zenKaku.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="フィード" />
        <meta name="theme-color" content="#1A1A2E" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={jakarta.className}>
        <StudentViewBanner />
        <IchigoHeader />
        {children}
        <BottomNav />
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
          }
        `}</Script>
        <PushInit />
      </body>
    </html>
  );
}
