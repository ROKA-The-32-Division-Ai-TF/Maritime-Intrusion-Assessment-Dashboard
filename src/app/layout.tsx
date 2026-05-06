import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "제32보병사단 밀입국 가능성 판단 지원 체계",
  description: "정적 운용 가능한 밀입국 가능성 판단 지원 대시보드",
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
