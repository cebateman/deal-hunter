"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type User = { id: number; email: string; name: string };

export default function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (pathname === "/login") return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, [pathname]);

  if (!user || pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="ml-auto flex items-center gap-3">
      <span className="text-xs text-muted">
        {user.name || user.email}
      </span>
      <button
        onClick={handleLogout}
        className="rounded-md border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
