import type { ReactNode } from "react";

export const metadata = {
  title: "IA SDR Core",
  description: "Agente de IA SDR integrado a Evolution API"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
