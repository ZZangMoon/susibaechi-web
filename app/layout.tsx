import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "수시 배치 계산기",
  description:
    "입시위키 수시 배치 계산기 엑셀을 분석해 Next.js 기반 웹앱으로 재구성한 프로젝트입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
