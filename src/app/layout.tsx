import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Minuta com Personalidade",
  description: "Gere minutas de contratos com o tom de voz certo e baixe em Word ou PDF.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppNav />
        {children}
      </body>
    </html>
  );
}
