"use client";

import Link from "next/link";

export default function NotificationsPage() {
  return (
    <main style={{ minHeight: "100vh", padding: 16, color: "#fff" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Notifications</h2>
        <p style={{ marginTop: 10, opacity: 0.75 }}>Coming soon.</p>
        <Link href="/" style={{ color: "rgba(255,255,255,.75)" }}>
          ← Back
        </Link>
      </div>
    </main>
  );
}