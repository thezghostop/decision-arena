"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient, setAuthToken } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  debateId?: string;
}

export function ReviewModal({ open, onClose, debateId }: Props) {
  const { getToken } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      if (token) setAuthToken(token);
      await apiClient.post("/api/v1/reviews/", {
        debate_id: debateId ?? null,
        rating,
        review_text: text.trim() || null,
      });
      setSubmitted(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      console.error("Review submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0f0f1a] border border-[#2a2a3e] rounded-2xl shadow-2xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-semibold text-lg">Rate your experience</h2>
              <p className="text-slate-400 text-sm mt-0.5">Help us improve Decision Arena</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {submitted ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-white font-semibold">Thanks for your review!</p>
              <p className="text-slate-400 text-sm mt-1">Your feedback means a lot.</p>
            </div>
          ) : (
            <>
              {/* Stars */}
              <div className="flex items-center justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "w-9 h-9 transition-colors",
                        star <= (hovered || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-slate-600"
                      )}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-slate-400 mb-5 h-5">
                {LABELS[hovered || rating]}
              </p>

              {/* Text */}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tell us what you think (optional)..."
                rows={3}
                maxLength={500}
                className="w-full bg-[#111118] border border-[#2a2a3e] rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/50 resize-none transition-colors mb-1"
              />
              <div className="text-right text-xs text-slate-600 mb-5">{text.length}/500</div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-[#2a2a3e]"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={rating === 0 || submitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? "Submitting…" : "Submit Review"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
