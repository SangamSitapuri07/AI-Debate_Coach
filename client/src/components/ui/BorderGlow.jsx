import { useRef, useCallback } from "react";
import "./BorderGlow.css";

export default function BorderGlow({ children, className = "" }) {
  const cardRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();

    // Get mouse position relative to the card
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Set CSS variables for the glow position
    card.style.setProperty("--glow-x", `${x}px`);
    card.style.setProperty("--glow-y", `${y}px`);
    card.style.setProperty("--glow-opacity", "1");
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--glow-opacity", "0");
  }, []);

  return (
    <div
      ref={cardRef}
      className={`border-glow ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Border glow layer */}
      <div className="border-glow__border" />
      {/* Inner glow layer */}
      <div className="border-glow__glow" />
      {/* Content */}
      <div className="border-glow__content">
        {children}
      </div>
    </div>
  );
}