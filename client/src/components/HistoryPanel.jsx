import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function HistoryPanel({ history, onClose }) {
  const [selectedSession, setSelectedSession] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const { sessions, groupedSessions, deleteSession, clearHistory, totalSessions } = history;

  // ── Session Detail View ────────────────────────────────────
  if (selectedSession) {
    return (
      <div className="history-panel">
        <div className="history-header">
          <button className="history-back" onClick={() => setSelectedSession(null)}>
            ← Back
          </button>
          <div className="history-header-info">
            <span className="history-session-mode">{selectedSession.modeLabel}</span>
            <span className="history-session-date">
              {selectedSession.date} at {selectedSession.time}
            </span>
          </div>
          <button className="history-close" onClick={onClose}>✕</button>
        </div>

        <div className="history-detail">
          {/* Battle Session Detail */}
          {selectedSession.type === "battle" && (
            <div className="history-battle-meta">
              <div className="battle-meta-card">
                <span className="meta-label">Topic</span>
                <span className="meta-value">{selectedSession.topic}</span>
              </div>
              <div className="battle-meta-row">
                <div className="battle-meta-card">
                  <span className="meta-label">Your Side</span>
                  <span className="meta-value meta-side">
                    {selectedSession.userSide === "for" ? "🟢 FOR" : "🔴 AGAINST"}
                  </span>
                </div>
                <div className="battle-meta-card">
                  <span className="meta-label">Rounds</span>
                  <span className="meta-value">
                    {selectedSession.roundsPlayed}/{selectedSession.totalRounds}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="history-messages">
            {selectedSession.messages.map((msg, i) => (
              <div
                key={i}
                className={`history-msg history-msg--${msg.role === "user" ? "user" : "ai"}`}
              >
                <div className="history-msg-avatar">
                  {msg.role === "user" ? "👤" : "🤖"}
                </div>
                <div className="history-msg-bubble">
                  {msg.role === "user" ? (
                    <p>{msg.content}</p>
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Battle Feedback */}
          {selectedSession.feedback && (
            <div className="history-feedback">
              <h3 className="history-feedback-title">🏆 Battle Feedback</h3>
              <div className="history-feedback-content">
                <ReactMarkdown>{selectedSession.feedback}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Session List View ──────────────────────────────────────
  return (
    <div className="history-panel">
      {/* Header */}
      <div className="history-header">
        <div className="history-header-left">
          <h2 className="history-title">📜 History</h2>
          <span className="history-count">{totalSessions} sessions</span>
        </div>
        <div className="history-header-right">
          {totalSessions > 0 && (
            <button
              className="history-clear-btn"
              onClick={() => setConfirmClear(true)}
              title="Clear all history"
            >
              🗑️ Clear All
            </button>
          )}
          <button className="history-close" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* Confirm Clear */}
      {confirmClear && (
        <div className="history-confirm">
          <p>Delete all {totalSessions} sessions?</p>
          <div className="history-confirm-btns">
            <button
              className="confirm-yes"
              onClick={() => {
                clearHistory();
                setConfirmClear(false);
              }}
            >
              Yes, Delete All
            </button>
            <button
              className="confirm-no"
              onClick={() => setConfirmClear(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalSessions === 0 && (
        <div className="history-empty">
          <div className="history-empty-icon">📭</div>
          <h3>No history yet</h3>
          <p>Your debate sessions will appear here after you start practicing.</p>
        </div>
      )}

      {/* Sessions List */}
      <div className="history-list">
        {Object.entries(groupedSessions).map(([date, dateSessions]) => (
          <div key={date} className="history-date-group">
            <div className="history-date-label">{date}</div>
            {dateSessions.map((session) => (
              <div
                key={session.id}
                className="history-item"
                onClick={() => setSelectedSession(session)}
              >
                <div className="history-item-left">
                  <span className="history-item-mode">{session.modeLabel}</span>
                  <p className="history-item-title">{session.title}</p>
                  <span className="history-item-meta">
                    {session.type === "battle"
                      ? `${session.roundsPlayed} rounds · ${session.time}`
                      : `${session.messages?.length || 0} messages · ${session.time}`
                    }
                  </span>
                </div>
                <div className="history-item-right">
                  <button
                    className="history-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    title="Delete session"
                  >
                    🗑️
                  </button>
                  <span className="history-item-arrow">›</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}