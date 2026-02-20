import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const titleFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-title"
});

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "AquaFootprint Copilot",
  description: "MVP para calculo de huella hidrica azul, verde y gris por unidad de producto."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-variant="agro-premium">
      <body className={`${titleFont.variable} ${bodyFont.variable} bg-background font-body text-foreground antialiased`}>
        {children}
      </body>
    </html>
  );
}
