import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "משחק ניחוש מילים",
  description: "משחק ניחוש מילים בעברית - נחשו את המילה לפי התיאור!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
