import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

const description =
  "I build stablecoin and AI products, and the developer ecosystems around them. Product & Developer Relations at MOI Protocol (Sarva Labs).";

export const metadata: Metadata = {
  metadataBase: new URL("https://adithya-site.vercel.app"),
  title: "Adithya Ganesh",
  description,
  openGraph: {
    title: "Adithya Ganesh",
    description,
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Adithya Ganesh",
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body className="bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
