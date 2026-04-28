import { useState } from "react";
import BattleArena3D from "./BattleArena3D";
import CinematicIntro from "./CinematicIntro";  // ← ADD THIS
import ReactMarkdown from "react-markdown";
import API_URL from "../config";

const API = API_URL;

export default function BattleMode({ history }) {
  const [phase, setPhase]                     = useState("setup");
  const [topic, setTopic]                     = useState("");
  const [rounds, setRounds]                   = useState(3);
  const [userSide, setUserSide]               = useState("for");
  const [battle, setBattle]                   = useState(null);
  const [error, setError]                     = useState("");
  const [validating, setValidating]           = useState(false);
  const [feedback, setFeedback]               = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [showCinematic, setShowCinematic]     = useState(false); // ← ADD

  const examples = [
    "Should artificial intelligence be regulated?",
    "Social media does more harm than good",
    "University education should be free",
    "Remote work is better than office work",
    "Climate change should be the top priority",
  ];

  const startBattle = async () => {
    if (!topic.trim() || topic.length < 10) {
      setError("Enter a complete debate topic");
      return;
    }
    setValidating(true);
    setError("");

    try {
      const res = await fetch(`${API}/api/validate-topic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = await res.json();

      if (!data.isValid) {
        setError(data.message || "Not a valid debate topic");
        return;
      }

      // ✅ Show cinematic FIRST, then battle starts after
      
      setShowCinematic(true);

    } catch (err) {
      setError("Server error. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  // Called when cinematic finishes or is skipped
  const handleCinematicComplete = () => {
    setShowCinematic(false);
    setBattle({
      topic: topic.trim(),
      totalRounds: rounds,
      userSide,
      aiSide: userSide === "for" ? "Against" : "For",
      messages: [],
      currentRound: 1,
    });
    setPhase("battle");
  };

  const endBattle = async (data) => {
    setBattle(data);
    setPhase("results");
    setLoadingFeedback(true);

    try {
      const transcript = data.messages
        .map((m, i) => {
          const roundNum = Math.floor(i / 2) + 1;
          const speaker  = m.role === "user" ? "HUMAN" : "AI";
          return `[Round ${roundNum}] ${speaker}:\n${m.content}`;
        })
        .join("\n\n" + "─".repeat(50) + "\n\n");

      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Judge this debate. Analyze the HUMAN debater's performance.
TOPIC: "${data.topic}"
HUMAN: ${data.userSide} | AI: ${data.aiSide}
ROUNDS: ${Math.floor(data.messages.length / 2)}

TRANSCRIPT:
${transcript}`,
          mode: "battle-feedback",
          history: [],
          battleContext: {
            topic: data.topic,
            userSide: data.userSide,
            aiSide: data.aiSide,
            totalRounds: data.totalRounds,
          },
        }),
      });

      const result = await res.json();
      if (result.error) throw new Error(result.error);

      setFeedback(result.reply);

      if (history) {
        history.saveBattleSession(data, result.reply);
      }
    } catch (err) {
      setFeedback(`⚠️ Error: ${err.message}`);
      if (history) history.saveBattleSession(data, null);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const restart = () => {
    setPhase("setup");
    setTopic("");
    setBattle(null);
    setError("");
    setFeedback(null);
    setShowCinematic(false);
  };

  // ── CINEMATIC OVERLAY ──
  if (showCinematic) {
    return (
      <CinematicIntro
        topic={topic}
        onComplete={handleCinematicComplete}
      />
    );
  }

  // SETUP
  if (phase === "setup") {
    return (
      <div className="battle-setup">
        <div className="setup-header">
          <span className="setup-icon">⚔️</span>
          <h1>Debate Battle</h1>
          <p>Challenge the AI in a 3D debate arena</p>
        </div>

        <div className="setup-form">
          <input
            type="text"
            placeholder="Enter your debate topic..."
            value={topic}
            onChange={(e) => { setTopic(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && startBattle()}
            className={error ? "error" : ""}
          />

          <div className="topic-examples">
            {examples.map((ex, i) => (
              <button key={i} onClick={() => { setTopic(ex); setError(""); }}>
                {ex}
              </button>
            ))}
          </div>

          {error && <div className="error-message">🚫 {error}</div>}

          <div className="setup-options">
            <div className="option-group">
              <label>Your Position</label>
              <div className="option-buttons">
                <button className={userSide === "for" ? "active" : ""} onClick={() => setUserSide("for")}>
                  🟢 FOR
                </button>
                <button className={userSide === "against" ? "active" : ""} onClick={() => setUserSide("against")}>
                  🔴 AGAINST
                </button>
              </div>
            </div>
            <div className="option-group">
              <label>Rounds</label>
              <div className="option-buttons">
                {[3, 5, 7].map((r) => (
                  <button key={r} className={rounds === r ? "active" : ""} onClick={() => setRounds(r)}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            className="start-btn"
            onClick={startBattle}
            disabled={!topic.trim() || validating}
          >
            {validating ? "🔍 Checking..." : "⚔️ Start Battle"}
          </button>
        </div>
      </div>
    );
  }

  // BATTLE
  if (phase === "battle") {
    return (
      <BattleArena3D
        battleData={battle}
        setBattleData={setBattle}
        onEnd={endBattle}
      />
    );
  }

  // RESULTS
  return (
    <div className="battle-results">
      <div className="results-header">
        <span className="trophy">🏆</span>
        <h1>Battle Complete!</h1>
        <p>{battle?.topic}</p>
      </div>

      <div className="results-content">
        {loadingFeedback ? (
          <div className="results-loading">
            <span>🤔</span>
            <p>AI judge is analyzing your performance...</p>
          </div>
        ) : (
          <div className="results-feedback">
            <ReactMarkdown>{feedback}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="results-actions">
        <button onClick={restart}>🔄 New Battle</button>
        <button onClick={() => window.location.reload()}>🏠 Home</button>
      </div>
    </div>
  );
}