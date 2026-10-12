import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NUS 课程节奏看板",
  icons: { icon: "/favicon.svg" },
  description: "A self-hosted, privacy-first Canvas course dashboard.",
  openGraph: {
    title: "NUS 课程节奏看板",
    description: "课程、作业、考试，一处追踪。",
  },
  twitter: {
    card: "summary_large_image",
    title: "NUS 课程节奏看板",
    description: "课程、作业、考试，一处追踪。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
