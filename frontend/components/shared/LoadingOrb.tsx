"use client";

import { motion } from "framer-motion";

interface LoadingOrbProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function LoadingOrb({ size = "md", label }: LoadingOrbProps) {
  const sizeMap = { sm: 40, md: 80, lg: 120 };
  const s = sizeMap[size];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: s, height: s }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border border-arena-purple/60"
            animate={{ scale: [1, 1.5 + i * 0.3, 1], opacity: [0.8, 0, 0.8] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut",
            }}
          />
        ))}
        <motion.div
          className="absolute inset-[20%] rounded-full bg-gradient-to-br from-arena-purple to-arena-blue"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            boxShadow: "0 0 20px rgba(124,58,237,0.6), 0 0 40px rgba(124,58,237,0.3)",
          }}
        />
      </div>
      {label && (
        <p className="text-sm text-slate-400 animate-pulse">{label}</p>
      )}
    </div>
  );
}
