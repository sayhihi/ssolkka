import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "쏠까 - 오늘 커피 누가 쏠까",
  description: "운세로 정하는 오늘의 커피 요정. 운이 제일 좋은 사람이 베푸는 날.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-4 pb-8 pt-6">{children}</main>
      </body>
    </html>
  );
}
