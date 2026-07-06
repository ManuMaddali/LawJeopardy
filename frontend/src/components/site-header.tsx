"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, LayoutGrid, Upload } from "lucide-react";

import { ThemeSelector } from "@/components/theme-selector";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/boards", label: "Boards", icon: BookOpenCheck },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur"
      style={{ backgroundColor: "var(--header-bg)", borderColor: "var(--header-border)" }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3.5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-foreground shadow-sm">
            J
          </span>
          <span className="font-display text-base font-extrabold tracking-tight text-foreground sm:text-lg">
            Georgia Bar Jeopardy
          </span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold transition-colors sm:px-3",
                    active
                      ? "bg-primary-soft text-primary-soft-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
          <ThemeSelector />
        </div>
      </div>
    </header>
  );
}
