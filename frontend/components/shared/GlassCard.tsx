import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "strong" | "subtle";
  glow?: boolean;
  glowColor?: string;
}

export function GlassCard({
  className,
  variant = "default",
  glow = false,
  glowColor,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl transition-all duration-300",
        variant === "default" && "glass",
        variant === "strong" && "glass-strong",
        variant === "subtle" && "bg-white/[0.02] border border-white/[0.05]",
        glow && "glow-purple",
        className,
      )}
      style={
        glowColor
          ? { boxShadow: `0 0 20px ${glowColor}40, 0 0 40px ${glowColor}15` }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
}
