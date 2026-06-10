"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { Brain, History, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  const links = [
    { href: "/arena", label: "New Debate", icon: PlusCircle },
    { href: "/history", label: "History", icon: History },
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
