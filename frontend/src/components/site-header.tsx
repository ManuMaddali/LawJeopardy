"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, LayoutGrid, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/boards", label: "Boards", icon: BookOpenCheck },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link
          href="/"
          className="bg-gradient-to-r from-cyan-300 via-indigo-200 to-violet-300 bg-clip-text text-lg font-black tracking-wide text-transparent"
        >
          Georgia Bar Jeopardy
        </Link>
        <nav className="flex items-center gap-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white",
                  active && "bg-white/15 text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
