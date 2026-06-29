"use client";

import { useCallback, useState } from "react";
import { type Archetype, SWAP_MAP } from "@/lib/quizzes";
import { trackEvent } from "@/lib/tracking";

interface ResultPageProps {
  archetype: Archetype;
  answers: Record<string, string>;
  onRetake: () => void;
}

export function ResultPage({ archetype, answers, onRetake }: ResultPageProps) {
  const [shared, setShared] = useState(false);
  const appStoreUrl =
    process.env.NEXT_PUBLIC_APP_STORE_URL ?? "#";

  const handleShare = useCallback(async () => {
    trackEvent("share_profile", { archetype: archetype.id });
    const text = `I'm a ${archetype.name} on Sip Switch 🍋 — my perfect NA drink match is "${archetype.examples[0]}". Find yours:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Sip Switch Profile",
          text,
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(
          `${text} ${window.location.href}`
        );
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        // Clipboard failed
      }
    }
  }, [archetype]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center px-5 py-10 max-w-lg mx-auto">
      <div className="w-full result-enter">
        {/* Eyebrow */}
        <p className="text-[#C8A96E] text-xs uppercase tracking-[0.2em] font-semibold mb-6 text-center">
          Your Sip Switch Profile
        </p>

        {/* Archetype reveal */}
        <div className="text-center mb-6">
          <div className="text-[80px] leading-none mb-4">{archetype.emoji}</div>
          <h1 className="text-[32px] font-bold text-white mb-2">
            {archetype.name}
          </h1>
          <p className="text-[#DDDDDD] text-base mb-3">{archetype.tagline}</p>
          <p className="text-[#999999] text-[15px] leading-relaxed max-w-md mx-auto">
            {archetype.description}
          </p>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {archetype.categories.map((cat) => (
            <span
              key={cat}
              className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#C8A96E]/10 text-[#C8A96E] border border-[#C8A96E]/20"
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-[rgba(255,255,255,0.08)] mb-8" />

        {/* Example products */}
        <h2 className="text-lg font-semibold text-white mb-4">Start here.</h2>
        <div className="space-y-3 mb-8">
          {archetype.examples.map((example, i) => (
            <div
              key={example}
              className="p-4 rounded-[20px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] flex items-center gap-3"
            >
              <span className="text-[#C8A96E] text-lg">✦</span>
              <div>
                <p className="text-white text-sm font-medium">{example}</p>
                <p className="text-[#666666] text-xs mt-0.5">
                  {archetype.categories[i] ?? ""}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-[rgba(255,255,255,0.08)] mb-8" />

        {/* Swap Engine */}
        <h2 className="text-lg font-semibold text-white mb-1">
          Your switch, mapped.
        </h2>
        <p className="text-[#999999] text-sm mb-4">
          Every drink you love has a non-alcoholic match that actually works.
        </p>

        <div className="space-y-2 mb-8 max-h-[360px] overflow-y-auto pr-1">
          {SWAP_MAP.map((swap) => (
            <div
              key={swap.from}
              className="p-4 rounded-[20px] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] flex items-center gap-3"
            >
              <span className="text-lg flex-shrink-0">{swap.from}</span>
              <span className="text-[#C8A96E] flex-shrink-0">→</span>
              <span className="text-sm text-white font-medium text-right flex-1">
                {swap.to}
              </span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-[rgba(255,255,255,0.08)] mb-8" />

        {/* App CTA Block */}
        <div className="text-center">
          <p className="text-[#C8A96E] text-xs uppercase tracking-[0.2em] font-semibold mb-3">
            The Full Experience
          </p>

          <h2 className="text-xl font-bold text-white mb-2">
            Sip Switch finds your perfect NA drink — and learns your taste over
            time.
          </h2>
          <p className="text-[#999999] text-sm mb-6">
            The more you rate, the sharper your recommendations get.
          </p>

          {/* Blurred placeholder card */}
          <div className="w-[200px] h-[120px] mx-auto mb-4 rounded-[16px] bg-gradient-to-br from-[#C8A96E]/20 to-[#C8A96E]/5 relative overflow-hidden">
            <div className="absolute inset-0 backdrop-blur-[8px]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl relative z-10">🍋</span>
            </div>
          </div>

          <p className="text-[#999999] text-sm mb-6">
            Your personalised feed is waiting
          </p>

          <a
            href={appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent("cta_click", { archetype: archetype.id })
            }
            className="block w-full bg-[#C8A96E] text-[#0A0A0A] font-semibold text-lg py-[18px] rounded-[16px] hover:bg-[#D4B97E] transition-colors duration-200 cta-pulse text-center no-underline mb-3"
          >
            Download Sip Switch — free →
          </a>

          <p className="text-[#666666] text-xs">
            Free to explore · iOS only · No commitment
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-[rgba(255,255,255,0.08)] my-8" />

        {/* Share */}
        <button
          onClick={handleShare}
          className="w-full py-3 rounded-[16px] border border-[rgba(255,255,255,0.08)] text-white text-sm font-medium hover:bg-[rgba(255,255,255,0.05)] transition-colors duration-200 mb-3"
        >
          {shared ? "Copied!" : "Share my profile"}
        </button>

        {/* Retake */}
        <button
          onClick={onRetake}
          className="w-full text-center text-[#999999] text-sm hover:text-white transition-colors duration-150 mb-10"
        >
          Retake the quiz
        </button>

        {/* Footer */}
        <p className="text-center text-[#555555] text-xs">
          Sip Switch · Find your perfect non-alcoholic drink
        </p>
      </div>
    </div>
  );
}
