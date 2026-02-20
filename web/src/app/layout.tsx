import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deal Hunter",
  description: "Acquisition opportunity discovery system",
};

const NAV_LINKS = [
  { href: "/pipeline", label: "Pipeline" },
  { href: "/sources", label: "Sources" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-background text-foreground">
        <nav className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-3">
            <Link href="/pipeline" className="text-lg font-bold text-amber tracking-wide">
              DEAL HUNTER
            </Link>
            <div className="flex gap-6">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
