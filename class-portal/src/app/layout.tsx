import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Դասարան", template: "%s · Դասարան" },
  description: "Մեր դասարանի փակ թվային տարածքը"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hy" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
