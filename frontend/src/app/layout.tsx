import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Georgia Bar Jeopardy",
  description: "Rule recall that does not feel like another outline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeBootScript = `
    (function () {
      try {
        var mode = localStorage.getItem("theme-preference") || "system";
        var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        var resolved = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
        document.documentElement.setAttribute("data-theme", resolved);
      } catch (e) {}
    })();
  `;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-800">
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.14),transparent_42%),radial-gradient(circle_at_80%_15%,rgba(20,184,166,0.13),transparent_34%),radial-gradient(circle_at_18%_82%,rgba(245,158,11,0.17),transparent_36%),radial-gradient(circle_at_70%_70%,rgba(244,63,94,0.1),transparent_30%)]" />
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">{children}</main>
      </body>
    </html>
  );
}
