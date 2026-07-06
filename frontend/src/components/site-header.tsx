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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link
          href="/"
          className="bg-gradient-to-r from-blue-700 via-cyan-600 to-amber-600 bg-clip-text text-lg font-black tracking-wide text-transparent"
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
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700",
                  active && "bg-blue-100 text-blue-800",
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
