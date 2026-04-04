import type { Metadata } from "next";
import { Noto_Serif_JP } from "next/font/google";
import { ThemeScript } from "@/components/ThemeScript";
import "./globals.css";

const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "DayroAozora",
  description: "毎日、青空文庫をお届け",
  openGraph: {
    title: "DayroAozora",
    description: "毎日、青空文庫をお届け",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "ja_JP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={notoSerifJP.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
