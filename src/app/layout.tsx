import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, EB_Garamond, Montserrat } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});
const sans = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const reading = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "caseLeitura",
  description: "A casa dos seus livros: lidos, lendo e por ler.",
  // iPadOS: "Adicionar à Tela de Início" abre em tela cheia, sem a barra do Safari.
  appleWebApp: {
    title: "caseLeitura",
    capable: true,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3eee3",
  // Libera as áreas seguras (env(safe-area-inset-*)) no app instalado.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${sans.variable} ${reading.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper font-sans text-ink">{children}</body>
    </html>
  );
}
