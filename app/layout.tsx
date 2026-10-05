import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FGG UKM Research Proposal Portal",
  description: "Student proposal drafting, submission and coordinator review for the Faculty of Dentistry, UKM.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
