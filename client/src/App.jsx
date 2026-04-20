import { useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatMode from "./components/ChatMode";
import BattleMode from "./components/BattleMode";

const MODES = [
  { id: "learn", icon: "📚", label: "Learn", desc: "Generate arguments" },
  { id: "counter", icon: "🛡️", label: "Counter", desc: "Build rebuttals" },
  { id: "evaluate", icon: "📊", label: "Evaluate", desc: "Score arguments" },
  { id: "battle", icon: "⚔️", label: "Battle", desc: "Debate AI" },
];

export default function App() {
  const [mode, setMode] = useState("learn");
  const currentMode = MODES.find((m) => m.id === mode);

  return (
    <div className="app">
      <Sidebar modes={MODES} activeMode={mode} onModeChange={setMode} />
      <main className="main">
        {mode === "battle" ? (
          <BattleMode />
        ) : (
          <ChatMode mode={currentMode} />
        )}
      </main>
    </div>
  );
}