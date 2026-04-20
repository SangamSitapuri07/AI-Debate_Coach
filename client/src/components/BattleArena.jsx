import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import InputBox from "./InputBox";

// ⚠️ DIRECT API URL
const API_URL = "http://localhost:3001";

export default function BattleArena({ battleData, setBattleData, onEnd }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUserTurn, setIsUserTurn] = useState(true);
  const messagesEndRef = useRef(null);

  const { topic, totalRounds, userSide, aiSide, messages, currentRound } = battleData;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (text) => {
    if (!text.trim() || isLoading || !isUserTurn) return;

    // Add user message
    const userMsg = { id: Date.now(), role: "user", content: text, round: currentRound };
    const newMessages = [...messages, userMsg];
    setBattleData(prev => ({ ...prev, messages: newMessages }));

    setIsUserTurn(false);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          mode: "battle",
          history: newMessages.map(m => ({ role: m.role, content: m.content })),
          battleContext: {
            topic,
            userSide,
            aiSide,
            round: currentRound,
            totalRounds,
          },
        }),
      });

      const responseText = await response.text();
      
      if (!responseText) {
        throw new Error("Empty response from server");
      }

      const data = JSON.parse(responseText);

      if (data.error) {
        throw new Error(data.error);
      }

      const aiMsg = { id: Date.now() + 1, role: "assistant", content: data.reply, round: currentRound };

      setBattleData(prev => ({
        ...prev,
        messages: [...prev.messages, aiMsg],
        currentRound: currentRound + 1,
      }));

    } catch (err) {
      console.error("Battle error:", err);
      setBattleData(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: Date.now() + 1,
          role: "assistant",
          content: `⚠️ Error: ${err.message}`,
          isError: true
        }],
      }));
    } finally {
      setIsLoading(false);
      setIsUserTurn(true);
    }
  };

  const isLastRound = currentRound > totalRounds;

  return (
    <div className="battle-arena">
      {/* 3D Stage */}
      <div className="arena-stage">
        <div className="arena-stage__floor" />
        <div className="arena-stage__spotlight arena-stage__spotlight--left" />
        <div className="arena-stage__spotlight arena-stage__spotlight--right" />

        <div className="arena-podiums">
          <div className="arena-podium arena-podium--user">
            <div className="arena-podium__avatar">👤</div>
            <div className="arena-podium__name">You</div>
            <div className="arena-podium__side">{userSide}</div>
          </div>
          <div className="arena-podium arena-podium--ai">
            <div className="arena-podium__avatar">🤖</div>
            <div className="arena-podium__name">AI</div>
            <div className="arena-podium__side">{aiSide}</div>
          </div>
        </div>

        <div className="arena-vs">VS</div>

        <div className={`arena-turn ${isUserTurn ? "arena-turn--user" : "arena-turn--ai"}`}>
          <span className="arena-turn__round">
            Round {Math.min(currentRound, totalRounds)} / {totalRounds}
          </span>
          <span className="arena-turn__indicator">
            <span className="arena-turn__dot" />
            {isLoading ? "AI thinking..." : isLastRound ? "Battle Complete!" : isUserTurn ? "Your Turn" : "AI's Turn"}
          </span>
        </div>
      </div>

      {/* Topic Bar */}
      <div className="battle-topic">
        <div className="battle-topic__label">Topic</div>
        <div className="battle-topic__text">{topic}</div>
      </div>

      {/* Chat */}
      <div className="battle-chat">
        <div className="battle-chat__messages">
          {messages.length === 0 && (
            <div className="message message--ai">
              <div className="message__avatar">🤖</div>
              <div className="message__content">
                <strong>Ready to debate!</strong><br /><br />
                Topic: <em>"{topic}"</em><br /><br />
                You're arguing <strong>{userSide.toUpperCase()}</strong>.
                I'll be arguing <strong>{aiSide.toUpperCase()}</strong>.<br /><br />
                Present your opening argument!
              </div>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {!isLastRound ? (
          <div className="battle-chat__input">
            <InputBox
              onSend={handleSend}
              isLoading={isLoading || !isUserTurn}
              placeholder={isUserTurn ? "Present your argument..." : "Wait for AI..."}
            />
          </div>
        ) : (
          <div className="battle-controls">
            <button className="battle-controls__end" onClick={() => onEnd(battleData)}>
              📊 See Results & Feedback
            </button>
          </div>
        )}
      </div>
    </div>
  );
}