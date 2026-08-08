import type { Metadata } from "next";
import { SessionProvider } from "@/features/auth/components/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Panadería Castillo",
  description: "Sistema de gestión y punto de venta",
  icons: {
    icon: "/logo-castillo-gemini.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
