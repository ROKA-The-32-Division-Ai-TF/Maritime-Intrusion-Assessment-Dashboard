import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "백룡 AI The One",
  description: "휴리스틱 기반 작전기상 판단지원 정적 웹앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
