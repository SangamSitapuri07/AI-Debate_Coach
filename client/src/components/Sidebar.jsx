export default function Sidebar({ modes, activeMode, onModeChange }) {
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
        {modes.filter(m => m.id !== "battle").map((m) => (
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
          <span className="nav-icon">⚔️</span>
          <div className="nav-text">
            <span className="nav-label">Battle</span>
            <span className="nav-desc">Debate the AI</span>
          </div>
        </button>
      </nav>
    </aside>
  );
}