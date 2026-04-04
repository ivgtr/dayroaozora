import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DayroAozora",
  description: "毎日、青空文庫をお届け",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
