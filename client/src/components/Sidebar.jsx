import ThemeToggle from "./ThemeToggle";

export default function Sidebar({ modes, activeMode, onModeChange }) {
  const trainingModes = modes.filter((m) => m.id !== "battle");
  const battleMode    = modes.find((m) => m.id === "battle");

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🎓</div>
        <div className="sidebar-logo-text">
          <h1>Debate Coach</h1>
          <span>AI-Powered</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">Training</div>
        {trainingModes.map((m) => (
          <button
            key={m.id}
            className={`nav-btn ${activeMode === m.id ? "active" : ""}`}
            onClick={() => onModeChange(m.id)}
          >
            <span className="nav-icon">{m.icon}</span>
            <div className="nav-text">
              <span className="nav-label">{m.label}</span>
              <span className="nav-desc">{m.desc}</span>
            </div>
          </button>
        ))}

        <div className="sidebar-section">Challenge</div>
        <button
          className={`nav-btn battle ${activeMode === "battle" ? "active" : ""}`}
          onClick={() => onModeChange("battle")}
        >
          <span className="nav-icon">{battleMode.icon}</span>
          <div className="nav-text">
            <span className="nav-label">{battleMode.label}</span>
            <span className="nav-desc">{battleMode.desc}</span>
          </div>
        </button>
      </nav>

      {/* Theme toggle at bottom of sidebar */}
      <div className="sidebar-footer">
        <ThemeToggle className="sidebar-theme-toggle" />
      </div>
    </aside>
  );
}