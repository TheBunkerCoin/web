import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "BunkerCoin App",
  description: "WebApp and Hub for BunkerCoin",
  openGraph: {
    title: "BunkerCoin App",
    description: "WebApp and Hub for BunkerCoin",
    siteName: "BunkerCoin",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/img/bunkercoin-icon.png",
        width: 512,
        height: 512,
        alt: "BunkerCoin Logo",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/img/bunkercoin-icon.png", sizes: "any" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/img/bunkercoin-icon.png",
    shortcut: "/img/bunkercoin-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-neutral-950 text-white`}>
        <Header />
        <main className="pt-20 min-h-screen bg-neutral-950">
          {children}
        </main>
      </body>
    </html>
  );
}