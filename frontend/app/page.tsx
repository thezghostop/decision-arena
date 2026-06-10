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

const MODES = [
  {
    id: "standard",
    title: "Standard Arena",
    description: "Expert panel debates every angle of your decision",
    icon: Brain,
    color: "from-violet-600 to-purple-600",
  },
  {
    id: "boardroom",
    title: "Boardroom",
    description: "You're the CEO. AI executives challenge your strategy",
    icon: Users,
    color: "from-blue-600 to-cyan-600",
  },
  {
    id: "shark_tank",
    title: "Shark Tank",
    description: "AI investors tear apart your pitch — and rebuild it",
    icon: Zap,
    color: "from-orange-600 to-amber-600",
  },
  {
    id: "policy_arena",
    title: "Policy Arena",
    description: "Economists and politicians debate the real-world impact",
    icon: Shield,
    color: "from-green-600 to-emerald-600",
  },
];

const FEATURES = [
  {
    icon: Brain,
    title: "Multi-Agent Debate",
    description: "4–6 expert AI agents with distinct perspectives challenge your thinking",
  },
  {
    icon: Shield,
    title: "Fallacy Detection",
    description: "Real-time logical fallacy detection across all arguments",
  },
  {
    icon: BarChart3,
    title: "Live Scoring",
    description: "Dynamic scoring on logic, evidence, and persuasion",
  },
  {
    icon: Sparkles,
    title: "Decision Heatmap",
    description: "Visual breakdown of risk vs opportunity across dimensions",
  },
];

export default function LandingPage() {
  const { isSignedIn } = useUser();

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
          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <Link
                href="/arena"
                className="text-sm px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                Enter Arena <ArrowRight className="w-3 h-3" />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="text-sm px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
                >
                  Get Started
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
            Powered by Groq
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Don&apos;t just decide.
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Decide better.
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Multiple expert AI agents debate your most important decisions —
            exposing blind spots through structured adversarial deliberation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isSignedIn ? (
              <>
                <Link
                  href="/arena"
                  className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all hover:scale-105 glow-accent flex items-center gap-2 justify-center"
                >
                  Enter the Arena <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/history"
                  className="px-8 py-4 border border-[#1e1e2e] text-slate-300 hover:text-white hover:border-violet-500/50 rounded-xl transition-all"
                >
                  My Debates
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sign-up"
                  className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all hover:scale-105 glow-accent flex items-center gap-2 justify-center"
                >
                  Start a Debate <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/sign-in"
                  className="px-8 py-4 border border-[#1e1e2e] text-slate-300 hover:text-white hover:border-violet-500/50 rounded-xl transition-all"
                >
                  Sign In
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
            Choose Your Arena
          </h2>
          <p className="text-slate-400 text-center mb-12">
            Four debate formats designed for different decision contexts
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
            Built for high-stakes decisions
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
            Ready to stress-test your decision?
          </h2>
          <p className="text-slate-400 mb-8">
            Join the arena. Get a verdict in minutes.
          </p>
          <Link
            href={isSignedIn ? "/arena" : "/sign-up"}
            className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all hover:scale-105 glow-accent"
          >
            {isSignedIn ? "Enter the Arena" : "Start for free"}{" "}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#1e1e2e] py-8 px-6 text-center text-slate-500 text-sm">
        © {new Date().getFullYear()} Decision Arena — Built for hackathon. Powered by Groq.
      </footer>
    </div>
  );
}
