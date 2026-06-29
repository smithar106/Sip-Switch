"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  QUESTIONS,
  calculateArchetype,
  type Phase,
  type Archetype,
} from "@/lib/quizzes";
import { trackEvent } from "@/lib/tracking";
import { ResultPage } from "@/components/ResultPage";

export function QuizClient() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startQuiz = useCallback(() => {
    trackEvent("quiz_start");
    setQuestionIndex(0);
    setAnswers({});
    setSelectedOption(null);
    setArchetype(null);
    setPhase("quiz");
    setAnimKey((k) => k + 1);
  }, []);

  const advanceAfterSelection = useCallback(
    (optionId: string) => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      setSelectedOption(optionId);

      autoAdvanceRef.current = setTimeout(() => {
        const question = QUESTIONS[questionIndex];
        const newAnswers = { ...answers, [question.id]: optionId };
        setAnswers(newAnswers);
        setSelectedOption(null);

        if (questionIndex + 1 >= QUESTIONS.length) {
          const result = calculateArchetype(newAnswers);
          setArchetype(result);
          trackEvent("quiz_complete", {
            archetype: result.id,
            answers: newAnswers,
          });
          setPhase("capture");
        } else {
          setQuestionIndex((i) => i + 1);
        }
        setAnimKey((k) => k + 1);
      }, 180);
    },
    [questionIndex, answers]
  );

  const handleEmailSubmit = useCallback(async () => {
    const trimmed = email.trim();
    if (
      trimmed &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    ) {
      setEmailError(true);
      return;
    }

    setEmailError(false);
    setSubmitting(true);
    trackEvent("email_capture", { email: trimmed || "(skipped)" });

    if (trimmed && archetype) {
      try {
        await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmed,
            archetype_id: archetype.id,
            answers,
          }),
        });
      } catch {
        // Non-blocking
      }
    }

    setPhase("calculating");
    setTimeout(() => {
      setPhase("result");
      setAnimKey((k) => k + 1);
    }, 1800);
  }, [email, archetype, answers]);

  const handleSkip = useCallback(() => {
    trackEvent("email_skip");
    setPhase("calculating");
    setTimeout(() => {
      setPhase("result");
      setAnimKey((k) => k + 1);
    }, 1800);
  }, []);

  const retakeQuiz = useCallback(() => {
    startQuiz();
  }, [startQuiz]);

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  if (phase === "result" && archetype) {
    return (
      <ResultPage
        archetype={archetype}
        answers={answers}
        onRetake={retakeQuiz}
      />
    );
  }

  const question = QUESTIONS[questionIndex];

  const isTwoCard = questionIndex <= 1;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center px-5 py-10 max-w-lg mx-auto">
      {/* Landing Phase */}
      {phase === "landing" && (
        <div className="w-full flex flex-col items-center text-center mt-16 step-enter" key={animKey}>
          <div className="w-16 h-16 rounded-2xl bg-[#C8A96E]/10 flex items-center justify-center mb-6">
            <span className="text-3xl">🍋</span>
          </div>

          <p className="text-[#C8A96E] uppercase text-xs tracking-[0.2em] font-semibold mb-4">
            Sip Switch
          </p>

          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
            Find your perfect non-alcoholic drink
          </h1>

          <p className="text-[#999999] text-base leading-relaxed mb-10 max-w-sm">
            Tell us what you love about drinking. We find the NA version that
            actually satisfies.
          </p>

          <div className="w-full space-y-3 mb-10">
            {[
              "5 questions, under 60 seconds",
              "Matched to your exact taste profile",
              "Real products you can buy today",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 text-sm text-[#CCCCCC]"
              >
                <span className="text-[#C8A96E] text-base flex-shrink-0">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <button
            onClick={startQuiz}
            className="w-full bg-[#C8A96E] text-[#0A0A0A] font-semibold text-lg py-[18px] rounded-[16px] hover:bg-[#D4B97E] transition-colors duration-200 cta-pulse"
          >
            Find my drink →
          </button>
        </div>
      )}

      {/* Quiz Phase */}
      {phase === "quiz" && (
        <div className="w-full mt-8" key={`quiz-${animKey}`}>
          {/* Progress bar */}
          <div className="w-full h-1 bg-[rgba(255,255,255,0.08)] rounded-full mb-3">
            <div
              className="h-full bg-[#C8A96E] rounded-full progress-bar"
              style={{
                width: `${((questionIndex + 1) / QUESTIONS.length) * 100}%`,
              }}
            />
          </div>

          <p className="text-[#C8A96E] text-xs uppercase tracking-[0.15em] font-semibold mb-6">
            Step {questionIndex + 1} of {QUESTIONS.length}
          </p>

          <div className="step-enter">
            <h2 className="text-2xl font-bold mb-6">{question.text}</h2>

            <div
              className={
                isTwoCard
                  ? "grid grid-cols-1 gap-3"
                  : "grid grid-cols-2 gap-3"
              }
            >
              {question.options.map((option) => {
                const isSelected = selectedOption === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => advanceAfterSelection(option.id)}
                    disabled={selectedOption !== null}
                    className={`text-left p-5 rounded-[20px] border transition-all duration-200 ${
                      isSelected
                        ? "bg-[rgba(200,169,110,0.15)] border-[#C8A96E]"
                        : "bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]"
                    }`}
                  >
                    <span className="text-sm leading-snug block">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Email Capture Phase */}
      {phase === "capture" && (
        <div className="w-full flex flex-col items-center mt-24 step-enter" key={`capture-${animKey}`}>
          <h2 className="text-2xl font-bold mb-2 text-center">
            Your drink profile is ready.
          </h2>
          <p className="text-[#999999] text-sm mb-8 text-center">
            Save your matches to your inbox.
          </p>

          <div className="w-full mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(false);
              }}
              placeholder="your@email.com"
              className={`w-full px-5 py-4 rounded-[16px] bg-[rgba(255,255,255,0.05)] border ${
                emailError
                  ? "border-red-500"
                  : "border-[rgba(255,255,255,0.08)]"
              } text-white placeholder-[#666666] text-base outline-none focus:border-[#C8A96E] transition-colors duration-200`}
            />
            {emailError && (
              <p className="text-red-400 text-xs mt-2">Please enter a valid email address.</p>
            )}
          </div>

          <button
            onClick={handleEmailSubmit}
            disabled={submitting}
            className="w-full bg-[#C8A96E] text-[#0A0A0A] font-semibold text-base py-[18px] rounded-[16px] hover:bg-[#D4B97E] transition-colors duration-200 mb-3"
          >
            {submitting ? "Sending…" : "Send my matches →"}
          </button>

          <button
            onClick={handleSkip}
            disabled={submitting}
            className="text-[#999999] text-sm hover:text-white transition-colors duration-150"
          >
            Skip for now
          </button>
        </div>
      )}

      {/* Calculating Phase */}
      {phase === "calculating" && (
        <div className="w-full flex flex-col items-center justify-center mt-32">
          <div className="w-10 h-10 border-2 border-[#C8A96E] border-t-transparent rounded-full animate-spin mb-6" />
          <p className="text-[#999999] text-sm">Calculating your taste profile…</p>
        </div>
      )}
    </div>
  );
}
