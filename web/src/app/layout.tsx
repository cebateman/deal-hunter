import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import UserMenu from "./user-menu";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deal Hunter",
  description: "Acquisition opportunity discovery system",
};

const NAV_LINKS = [
  { href: "/pipeline", label: "Pipeline" },
  { href: "/criteria", label: "Criteria" },
  { href: "/sources", label: "Sources" },
];

// Inline script to set theme class before first paint (avoids flash)
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.replace('dark','light')}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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
            <UserMenu />
            <ThemeToggle />
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
