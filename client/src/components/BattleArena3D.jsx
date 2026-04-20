import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import Scene3D from "./arena/Scene3D";
import useVoice from "../hooks/useVoice";
import API_URL from "../config";

const API = API_URL;

export default function BattleArena3D({ battleData, setBattleData, onEnd }) {
  const [loading, setLoading]     = useState(false);
  const [input, setInput]         = useState("");
  const [humanAnim, setHumanAnim] = useState("idle");
  const [robotAnim, setRobotAnim] = useState("idle");
  const bottomRef                 = useRef(null);
  const animTimerRef              = useRef(null);
  const loadingRef                = useRef(false);

  const voice = useVoice();

  const { topic, totalRounds, userSide, aiSide, messages, currentRound } =
    battleData;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      voice.stopSpeaking();
    };
  }, []);

  useEffect(() => {
    voice.setOnFinal((text) => {
      if (text && !loadingRef.current) {
        sendArgument(text);
      }
    });
  }, [voice.setOnFinal, battleData]);

  const resetAnims = (delay = 10000) => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    animTimerRef.current = setTimeout(() => {
      setHumanAnim("idle");
      setRobotAnim("idle");
    }, delay);
  };

  const sendArgument = async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || loadingRef.current) return;

    setInput("");
    voice.setTranscript("");
    voice.stopSpeaking();

    loadingRef.current = true;
    setLoading(true);

    setHumanAnim("speaking");
    setRobotAnim("listening");

    const newMessages = [
      ...battleData.messages,
      { role: "user", content: text },
    ];
    setBattleData((prev) => ({ ...prev, messages: newMessages }));

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          mode: "battle",
          history: newMessages,
          battleContext: {
            topic,
            userSide,
            aiSide,
            round: battleData.currentRound,
            totalRounds,
          },
        }),
      });

      const data  = await res.json();
      const reply = data.reply || "No response";

      setRobotAnim("speaking");
      setHumanAnim("listening");

      setBattleData((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          { role: "assistant", content: reply },
        ],
        currentRound: prev.currentRound + 1,
      }));

      if (voice.voiceEnabled) {
        const wordCount     = reply.split(" ").length;
        const estDuration   = (wordCount / 2.5) * 1000 + 3000;
        resetAnims(estDuration);
        voice.speak(reply, () => {
          setHumanAnim("idle");
          setRobotAnim("idle");
        });
      } else {
        resetAnims(8000);
      }
    } catch (err) {
      setBattleData((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          { role: "assistant", content: `⚠️ ${err.message}`, error: true },
        ],
      }));
      setHumanAnim("idle");
      setRobotAnim("idle");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const isComplete = battleData.currentRound > totalRounds;

  return (
    <div className="arena-3d">
      {/* 3D Scene */}
      <div className="arena-3d__scene">
        {/* Round badge */}
        <div className="arena-3d__round">
          <span className="round-num">
            Round {Math.min(battleData.currentRound, totalRounds)}/{totalRounds}
          </span>
          <span className="round-divider">|</span>
          <span className="round-turn">
            {loading
              ? "🤖 AI thinking..."
              : isComplete
              ? "🏁 Battle Over"
              : voice.isListening
              ? "🎤 Listening..."
              : "👤 Your turn"}
          </span>
        </div>

        {/* VS */}
        <div className="arena-3d__vs">VS</div>

        {/* Labels */}
        <div className={`arena-3d__label arena-3d__label--human ${humanAnim === "speaking" ? "is-speaking" : ""}`}>
          <span className="char-name">You</span>
          <span className="char-side">{userSide}</span>
        </div>
        <div className={`arena-3d__label arena-3d__label--ai ${robotAnim === "speaking" ? "is-speaking" : ""}`}>
          <span className="char-name">AI</span>
          <span className="char-side">{aiSide}</span>
        </div>

        {/* AI Speaking Banner */}
        {voice.isSpeaking && (
          <div className="ai-speaking-banner">
            <div className="ai-speaking-banner__waves">
              <span /><span /><span /><span /><span />
            </div>
            <span className="ai-speaking-banner__text">AI is speaking</span>
            <div className="ai-speaking-banner__waves">
              <span /><span /><span /><span /><span />
            </div>
            <button
              className="ai-speaking-banner__stop"
              onClick={voice.stopSpeaking}
              title="Stop"
            >
              ⏹
            </button>
          </div>
        )}

        {/* Listening Banner */}
        {voice.isListening && (
          <div className="listening-banner">
            <div className="listening-banner__dot" />
            <span>Listening — speak your argument</span>
          </div>
        )}

        {/* Mic Error */}
        {voice.micError && (
          <div style={{
            position: "absolute",
            bottom: "70px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: "10px",
            padding: "10px 18px",
            color: "#f87171",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            zIndex: 100,
            maxWidth: "380px",
            textAlign: "center",
            backdropFilter: "blur(12px)",
          }}>
            ⚠️ {voice.micError}
          </div>
        )}

        {/* 3D Canvas */}
        <Scene3D
          humanAnimation={humanAnim}
          robotAnimation={robotAnim}
        />
      </div>

      {/* Topic + Voice Toggle */}
      <div className="arena-3d__topic">
        <span className="topic-label">TOPIC</span>
        <span className="topic-text">{topic}</span>
        <button
          className={`voice-toggle ${voice.voiceEnabled ? "voice-toggle--on" : ""}`}
          onClick={voice.toggleVoice}
          title={voice.voiceEnabled ? "Voice ON" : "Voice OFF"}
        >
          <span>{voice.voiceEnabled ? "🔊" : "🔇"}</span>
          <span className="voice-toggle__label">
            Voice {voice.voiceEnabled ? "ON" : "OFF"}
          </span>
        </button>
      </div>

      {/* Messages */}
      <div className="arena-3d__messages">
        {messages.length === 0 && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <strong>Let the debate begin!</strong><br /><br />
              Topic: <em>"{topic}"</em><br /><br />
              You argue <strong>{userSide.toUpperCase()}</strong>.
              I argue <strong>{aiSide.toUpperCase()}</strong>.<br /><br />
              {voice.supported.stt
                ? "💡 Enable voice then click 🎤 to speak!"
                : "Present your opening argument!"}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message ${msg.role === "user" ? "user" : "assistant"} ${msg.error ? "error" : ""}`}
          >
            <div className="message-avatar">
              {msg.role === "user" ? "👤" : "🤖"}
            </div>
            <div className="message-content">
              {msg.role === "user"
                ? msg.content
                : <ReactMarkdown>{msg.content}</ReactMarkdown>}
            </div>
            {msg.role === "assistant" && !msg.error && voice.supported.tts && (
              <button
                className="msg-speak-btn"
                onClick={() => voice.speak(msg.content)}
                title="Read aloud"
              >
                🔊
              </button>
            )}
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="typing"><span /><span /><span /></div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isComplete ? (
        <div className="arena-3d__input">
          {voice.supported.stt && voice.voiceEnabled && (
            <button
              className={`mic-btn ${voice.isListening ? "mic-btn--active" : ""}`}
              onClick={voice.toggleListening}
              disabled={loading}
              title={voice.isListening ? "Stop" : "Speak"}
            >
              {voice.isListening ? (
                <span className="mic-btn__waves">
                  <span /><span /><span />
                </span>
              ) : "🎤"}
            </button>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendArgument();
              }
            }}
            placeholder={
              voice.isListening
                ? "🎤 Listening..."
                : loading
                ? "Wait for AI..."
                : voice.voiceEnabled
                ? "Type or 🎤 speak..."
                : "Type your argument..."
            }
            disabled={loading || voice.isListening}
            rows={1}
            className={voice.isListening ? "is-listening" : ""}
          />

          <button
            className="arena-send-btn"
            onClick={() => sendArgument()}
            disabled={!input.trim() || loading || voice.isListening}
          >
            ➤
          </button>
        </div>
      ) : (
        <div className="arena-3d__end">
          <button onClick={() => onEnd(battleData)}>
            📊 See Results & Feedback
          </button>
        </div>
      )}
    </div>
  );
}