import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "PixEase - 图片处理工具",
  description: "图片处理平台，支持GIF编辑、格式转换、图片压缩、像素风转换等功能",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="antialiased overflow-x-hidden"
      suppressHydrationWarning
    >
      <body className="min-h-screen overflow-y-auto">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
