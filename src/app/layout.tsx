import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "백룡 기상판단 지원체계",
  description: "해상·육상·항공 상황을 분리 운용하는 설명가능 판단지원 대시보드",
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
