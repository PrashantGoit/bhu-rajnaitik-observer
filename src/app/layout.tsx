import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "BHU-RAJNAITIK OBSERVER — Geopolitics, Visualized.",
  description:
    "The official creator tool behind @bhurajnaitik. Produce professional geopolitical infographics in under 60 seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
         * Word-style font catalog — loaded as web fonts so the editor can
         * render headlines in any of these families. Inter / Inter Tight /
         * JetBrains Mono are also bundled via next/font above for the chrome.
         * Loading via <link> in body is acceptable here since it's a global
         * App Router layout (not a per-page font); the next/font lint rule
         * is aimed at pages/_document mistakes that don't apply to RSC.
         */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bangers&family=Bebas+Neue&family=EB+Garamond:wght@500;600;700&family=IBM+Plex+Mono:wght@500;600;700&family=Lora:wght@500;600;700&family=Merriweather:wght@400;700&family=Montserrat:wght@600;700;800&family=Oswald:wght@500;600;700&family=Playfair+Display:wght@600;700;800&family=Poppins:wght@500;600;700;800&family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@500;600;700&family=Roboto+Slab:wght@500;700&family=Russo+One&family=Teko:wght@500;600;700&family=Work+Sans:wght@500;600;700&display=swap"
        />
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
