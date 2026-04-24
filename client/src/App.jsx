import { useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatMode from "./components/ChatMode";
import BattleMode from "./components/BattleMode";
import ThemeToggle from "./components/ThemeToggle";
import HistoryPanel from "./components/HistoryPanel";
import useHistory from "./hooks/useHistory";

const MODES = [
  { id: "learn",    icon: "📚", label: "Learn",    desc: "Generate arguments" },
  { id: "counter",  icon: "🛡️", label: "Counter",  desc: "Build rebuttals"   },
  { id: "evaluate", icon: "📊", label: "Evaluate", desc: "Score arguments"   },
  { id: "battle",   icon: "⚔️", label: "Battle",   desc: "Debate AI"         },
];

export default function App() {
  const [mode, setMode]             = useState("learn");
  const [showHistory, setShowHistory] = useState(false);
  const currentMode = MODES.find((m) => m.id === mode);
  const history = useHistory();

  return (
    <div className="app">
      <Sidebar
        modes={MODES}
        activeMode={mode}
        onModeChange={setMode}
        onHistoryClick={() => setShowHistory(true)}
        historyCount={history.totalSessions}
      />

      <main className="main">
        {/* Top bar — mobile */}
        <div className="topbar">
          <span className="topbar__title">🎓 AI Debate Coach</span>
          <div className="topbar-actions">
            <button
              className="topbar-history-btn"
              onClick={() => setShowHistory(true)}
            >
              📜
              {history.totalSessions > 0 && (
                <span className="history-badge">{history.totalSessions}</span>
              )}
            </button>
            <ThemeToggle />
          </div>
        </div>

        {mode === "battle" ? (
          <BattleMode history={history} />
        ) : (
          <ChatMode mode={currentMode} history={history} />
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-bottom-nav">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mobile-nav-btn ${m.id === "battle" ? "battle-btn" : ""} ${mode === m.id ? "active" : ""}`}
            onClick={() => setMode(m.id)}
          >
            <span className="mobile-nav-btn__icon">{m.icon}</span>
            <span className="mobile-nav-btn__label">{m.label}</span>
          </button>
        ))}
      </nav>

      {/* History panel overlay */}
      {showHistory && (
        <div className="history-overlay" onClick={() => setShowHistory(false)}>
          <div
            className="history-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <HistoryPanel
              history={history}
              onClose={() => setShowHistory(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}