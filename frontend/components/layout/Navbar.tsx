"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { Brain, History, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, LOCALES } from "@/lib/i18n";

export function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const { t, locale, setLocale } = useI18n();

  const links = [
    { href: "/arena", label: t("nav.newDebate"), icon: PlusCircle },
    { href: "/history", label: t("nav.history"), icon: History },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#1e1e2e]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">Decision Arena</span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors",
                pathname === href
                  ? "bg-violet-600/20 text-violet-300"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}

          {/* Language switcher */}
          <div className="flex items-center gap-0.5 ml-2 bg-[#111118] border border-[#1e1e2e] rounded-lg p-0.5">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLocale(l.code)}
                title={l.label}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                  locale === l.code
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {l.script}
              </button>
            ))}
          </div>

          {isSignedIn && (
            <div className="ml-2">
              <UserButton />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
