"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import {
  Brain,
  Zap,
  Shield,
  BarChart3,
  Users,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useI18n, LOCALES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { isSignedIn } = useUser();
  const { t, locale, setLocale } = useI18n();

  const MODES = [
    {
      id: "standard",
      title: t("modes.standard.title"),
      description: t("modes.standard.description"),
      icon: Brain,
      color: "from-violet-600 to-purple-600",
    },
    {
      id: "boardroom",
      title: t("modes.boardroom.title"),
      description: t("modes.boardroom.description"),
      icon: Users,
      color: "from-blue-600 to-cyan-600",
    },
    {
      id: "shark_tank",
      title: t("modes.shark_tank.title"),
      description: t("modes.shark_tank.description"),
      icon: Zap,
      color: "from-orange-600 to-amber-600",
    },
    {
      id: "policy_arena",
      title: t("modes.policy_arena.title"),
      description: t("modes.policy_arena.description"),
      icon: Shield,
      color: "from-green-600 to-emerald-600",
    },
  ];

  const FEATURES = [
    {
      icon: Brain,
      title: t("features.multi_agent.title"),
      description: t("features.multi_agent.description"),
    },
    {
      icon: Shield,
      title: t("features.fallacy.title"),
      description: t("features.fallacy.description"),
    },
    {
      icon: BarChart3,
      title: t("features.scoring.title"),
      description: t("features.scoring.description"),
    },
    {
      icon: Sparkles,
      title: t("features.heatmap.title"),
      description: t("features.heatmap.description"),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#1e1e2e]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">Decision Arena</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Language switcher */}
            <div className="flex items-center gap-0.5 bg-[#111118] border border-[#1e1e2e] rounded-lg p-0.5">
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

            {isSignedIn ? (
              <Link
                href="/arena"
                className="text-sm px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {t("nav.enterArena")} <ArrowRight className="w-3 h-3" />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {t("nav.signIn")}
                </Link>
                <Link
                  href="/sign-up"
                  className="text-sm px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
                >
                  {t("nav.getStarted")}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-violet-900/20 via-transparent to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm mb-6">
            <Sparkles className="w-3 h-3" />
            {t("hero.badge")}
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            {t("hero.headline1")}
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              {t("hero.headline2")}
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            {t("hero.subtext")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isSignedIn ? (
              <>
                <Link
                  href="/arena"
                  className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all hover:scale-105 glow-accent flex items-center gap-2 justify-center"
                >
                  {t("hero.cta_enter")} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/history"
                  className="px-8 py-4 border border-[#1e1e2e] text-slate-300 hover:text-white hover:border-violet-500/50 rounded-xl transition-all"
                >
                  {t("hero.cta_debates")}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sign-up"
                  className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all hover:scale-105 glow-accent flex items-center gap-2 justify-center"
                >
                  {t("hero.cta_start")} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/sign-in"
                  className="px-8 py-4 border border-[#1e1e2e] text-slate-300 hover:text-white hover:border-violet-500/50 rounded-xl transition-all"
                >
                  {t("hero.cta_signin")}
                </Link>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* Modes */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            {t("modes_section.heading")}
          </h2>
          <p className="text-slate-400 text-center mb-12">
            {t("modes_section.subheading")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODES.map((mode, i) => (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-xl p-6 hover:border-violet-500/30 transition-all group cursor-pointer"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <mode.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">{mode.title}</h3>
                <p className="text-sm text-slate-400">{mode.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-[#1e1e2e]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {t("features_section.heading")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center border-t border-[#1e1e2e]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-4">
            {t("cta.heading")}
          </h2>
          <p className="text-slate-400 mb-8">
            {t("cta.subtext")}
          </p>
          <Link
            href={isSignedIn ? "/arena" : "/sign-up"}
            className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all hover:scale-105 glow-accent"
          >
            {isSignedIn ? t("cta.enter") : t("cta.start_free")}{" "}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#1e1e2e] py-8 px-6 text-center text-slate-500 text-sm">
        {t("footer", { year: String(new Date().getFullYear()) })}
      </footer>
    </div>
  );
}
