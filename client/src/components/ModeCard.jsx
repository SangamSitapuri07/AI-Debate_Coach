/**
 * ModeCard — Beautiful card component for mode selection
 * Used in welcome screens and mode selection grids
 */

export default function ModeCard({ mode, isActive, onClick, size = "normal" }) {
  const { id, icon, label, desc, color } = mode;

  const colors = {
    learn: { bg: "rgba(59, 130, 246, 0.1)", border: "#3b82f6", glow: "rgba(59, 130, 246, 0.3)" },
    counter: { bg: "rgba(16, 185, 129, 0.1)", border: "#10b981", glow: "rgba(16, 185, 129, 0.3)" },
    evaluate: { bg: "rgba(245, 158, 11, 0.1)", border: "#f59e0b", glow: "rgba(245, 158, 11, 0.3)" },
    battle: { bg: "rgba(139, 92, 246, 0.1)", border: "#8b5cf6", glow: "rgba(139, 92, 246, 0.3)" },
  };

  const c = colors[id] || colors.learn;

  return (
    <button
      className={`mode-card mode-card--${size} ${isActive ? "mode-card--active" : ""}`}
      onClick={onClick}
      style={{
        "--card-bg": c.bg,
        "--card-border": c.border,
        "--card-glow": c.glow,
      }}
    >
      <div className="mode-card__icon">{icon}</div>
      <div className="mode-card__content">
        <h3 className="mode-card__label">{label}</h3>
        <p className="mode-card__desc">{desc}</p>
      </div>
      {isActive && <div className="mode-card__check">✓</div>}
    </button>
  );
}