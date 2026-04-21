import { useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatMode from "./components/ChatMode";
import BattleMode from "./components/BattleMode";
import ThemeToggle from "./components/ThemeToggle";

const MODES = [
  { id: "learn",    icon: "📚", label: "Learn",    desc: "Generate arguments" },
  { id: "counter",  icon: "🛡️", label: "Counter",  desc: "Build rebuttals"   },
  { id: "evaluate", icon: "📊", label: "Evaluate", desc: "Score arguments"   },
  { id: "battle",   icon: "⚔️", label: "Battle",   desc: "Debate AI"         },
];

export default function App() {
  const [mode, setMode] = useState("learn");
  const currentMode = MODES.find((m) => m.id === mode);

  return (
    <div className="app">
      {/* Sidebar — desktop */}
      <Sidebar modes={MODES} activeMode={mode} onModeChange={setMode} />

      {/* Main */}
      <main className="main">
        {/* Top bar with theme toggle — mobile */}
        <div className="topbar">
          <span className="topbar__title">AI Debate Coach</span>
          <ThemeToggle />
        </div>

        {mode === "battle" ? (
          <BattleMode />
        ) : (
          <ChatMode mode={currentMode} />
        )}
      </main>

      {/* Bottom nav — mobile */}
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
    </div>
  );
}