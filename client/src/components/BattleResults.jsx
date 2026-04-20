import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

// ⚠️ DIRECT API URL
const API_URL = "http://localhost:3001";

export default function BattleResults({ battleData, onRestart }) {
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { topic, messages, totalRounds, userSide, aiSide } = battleData;

  useEffect(() => {
    getFeedback();
  }, []);

  const getFeedback = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const transcript = messages
        .map(m => `${m.role === "user" ? "HUMAN" : "AI"}: ${m.content}`)
        .join("\n\n");

      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Evaluate this debate:\n\n${transcript}`,
          mode: "battle-feedback",
          history: [],
          battleContext: { topic, totalRounds, userSide, aiSide },
        }),
      });

      const responseText = await response.text();

      if (!responseText) {
        throw new Error("Empty response");
      }

      const data = JSON.parse(responseText);

      if (data.error) {
        throw new Error(data.error);
      }

      setFeedback(data.reply);

    } catch (err) {
      console.error("Feedback error:", err);
      setError(err.message);
      setFeedback(`⚠️ Error getting feedback: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="battle-results">
      <div className="battle-results__header">
        <div className="battle-results__icon">🏆</div>
        <h1 className="battle-results__title">Battle Complete!</h1>
        <p className="battle-results__topic">Topic: {topic}</p>
      </div>

      <div className="battle-results__content">
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤔</div>
            <p style={{ color: "var(--text-secondary)" }}>
              AI is analyzing your performance...
            </p>
          </div>
        ) : (
          <div className="message__content">
            <ReactMarkdown>{feedback}</ReactMarkdown>
          </div>
        )}

        {error && (
          <button
            onClick={getFeedback}
            style={{
              marginTop: "16px",
              padding: "10px 20px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            🔄 Retry
          </button>
        )}
      </div>

      <div className="battle-results__actions">
        <button className="battle-results__btn battle-results__btn--secondary" onClick={onRestart}>
          🔙 New Battle
        </button>
        <button
          className="battle-results__btn battle-results__btn--primary"
          onClick={() => window.location.reload()}
        >
          🏠 Back to Training
        </button>
      </div>
    </div>
  );
}