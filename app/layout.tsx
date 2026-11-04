import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Rixx Studio — gestion de commandes pour graphistes",
  description:
    "Commandes clients, boards de travail, paiements et deadlines pour graphistes et artistes indépendants.",
};

export const viewport: Viewport = {
  themeColor: "#0b0c12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
