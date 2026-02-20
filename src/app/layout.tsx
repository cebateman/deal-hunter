import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deal Hunter — Acquisition Opportunity Tracker",
  description: "Discover, score, and track business acquisition opportunities",
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-gray-400 hover:text-brand-gold transition-colors px-3 py-1.5 rounded-md hover:bg-brand-card"
    >
      {children}
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-darker">
        <header className="border-b border-brand-border bg-brand-dark sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-brand-gold font-bold text-lg tracking-tight">
                  DEAL HUNTER
                </span>
              </Link>
              <nav className="flex items-center gap-1">
                <NavLink href="/">Pipeline</NavLink>
                <NavLink href="/criteria">Criteria</NavLink>
                <NavLink href="/feedback">Feedback</NavLink>
                <NavLink href="/sources">Sources</NavLink>
              </nav>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
