import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FIFA_2026_INTRO,
  markFifa2026IntroSeen,
  prefersReducedMotion,
} from "../constants/fifa2026Intro";
import "./Fifa2026HomeIntro.css";

const EXIT_MS = 700;
const REDUCED_EXIT_MS = 400;

export default function Fifa2026HomeIntro({ onComplete }) {
  const [exiting, setExiting] = useState(false);
  const [skipVisible, setSkipVisible] = useState(false);
  const completedRef = useRef(false);
  const reducedMotion = prefersReducedMotion();

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    markFifa2026IntroSeen();
    setExiting(true);
    window.setTimeout(() => {
      onComplete?.();
    }, reducedMotion ? REDUCED_EXIT_MS : EXIT_MS);
  }, [onComplete, reducedMotion]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const skipTimer = window.setTimeout(() => {
      setSkipVisible(true);
    }, FIFA_2026_INTRO.skipDelayMs);

    const autoTimer = window.setTimeout(
      finish,
      reducedMotion ? REDUCED_EXIT_MS + 200 : FIFA_2026_INTRO.durationMs
    );

    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(skipTimer);
      window.clearTimeout(autoTimer);
    };
  }, [finish, reducedMotion]);

  const overlay = (
    <div
      className={[
        "fifa-intro-overlay",
        exiting ? "fifa-intro-exiting" : "",
        reducedMotion ? "fifa-intro-reduced" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={`${FIFA_2026_INTRO.title} ${FIFA_2026_INTRO.subtitle} introduction`}
    >
      <div className="fifa-intro-flag-bar" aria-hidden="true" />
      <div className="fifa-intro-ring" aria-hidden="true" />

      <div className="fifa-intro-particles" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6].map((id) => (
          <span key={id} className="fifa-intro-particle" />
        ))}
      </div>

      <div className="fifa-intro-ball-wrap" aria-hidden="true">
        <div className="fifa-intro-ball">⚽</div>
      </div>

      {(skipVisible || reducedMotion) && (
        <button
          type="button"
          className="fifa-intro-skip"
          onClick={finish}
          aria-label="Skip introduction"
        >
          Skip
        </button>
      )}

      <div className="fifa-intro-content">
        <div className="fifa-intro-card">
          <div className="fifa-intro-card-flag" aria-hidden="true" />
          <div className="fifa-intro-star" aria-hidden="true">
            ★
          </div>
          <p className="fifa-intro-kicker">{FIFA_2026_INTRO.kicker}</p>
          <h1 className="fifa-intro-title">
            <span>{FIFA_2026_INTRO.title}</span>
          </h1>
          <p className="fifa-intro-subtitle">{FIFA_2026_INTRO.subtitle}</p>
          <p className="fifa-intro-tagline">{FIFA_2026_INTRO.tagline}</p>
          <p className="fifa-intro-brand">{FIFA_2026_INTRO.brandLine}</p>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
