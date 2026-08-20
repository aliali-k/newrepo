import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JEEINDIA — Mentor Verification",
  description: "Live adaptive AI interview for JEEINDIA mentor verification, Round 2.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
