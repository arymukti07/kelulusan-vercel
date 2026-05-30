import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pengumuman Kelulusan",
  description: "Portal pengumuman kelulusan siswa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
