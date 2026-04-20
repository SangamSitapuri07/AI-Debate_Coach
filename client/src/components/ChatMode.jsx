import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import API_URL from "../config";

const API = API_URL;

const CONFIG = {
  learn: {
    icon: "📚",
    title: "Argument Generator",
    desc: "Enter any debate topic and I'll generate structured arguments for both sides.",
    placeholder: "Enter a debate topic... (e.g., 'Should homework be banned?')",
    color: "cyan",
  },
  counter: {
    icon: "🛡️",
    title: "Counterargument Builder",
    desc: "Share an argument and I'll help you build a powerful rebuttal.",
    placeholder: "Enter an argument to counter...",
    color: "purple",
  },
  evaluate: {
    icon: "📊",
    title: "Argument Evaluator",
    desc: "Present your argument and I'll score it with feedback.",
    placeholder: "Enter your argument to evaluate...",
    color: "emerald",
  },
};

function TypingIndicator() {
  return (
    <div className="chat-typing">
      <div className="chat-typing__avatar">🤖</div>
      <div className="chat-typing__dots">
        <span /><span /><span />
      </div>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`chat-msg ${isUser ? "chat-msg--user" : "chat-msg--ai"} ${msg.error ? "chat-msg--error" : ""}`}>
      <div className="chat-msg__avatar">
        {isUser ? "👤" : "🤖"}
      </div>
      <div className="chat-msg__bubble">
        {isUser
          ? <p>{msg.content}</p>
          : <ReactMarkdown>{msg.content}</ReactMarkdown>
        }
      </div>
    </div>
  );
}

export default function ChatMode({ mode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [serverOk, setServerOk] = useState(null);

  const textareaRef = useRef(null);
  const bottomRef   = useRef(null);
  const modeId      = mode?.id || "learn";
  const cfg         = CONFIG[modeId] || CONFIG.learn;

  useEffect(() => {
    fetch(`${API}/api/health`)
      .then((r) => r.ok ? setServerOk(true) : setServerOk(false))
      .catch(() => setServerOk(false));
  }, []);

  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [modeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg = { id: Date.now(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          mode: modeId,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: `⚠️ ${err.message}`,
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chatmode">
      {serverOk === false && (
        <div className="chatmode__banner chatmode__banner--error">
          ❌ Cannot connect to server. Please try again later.
        </div>
      )}

      {messages.length === 0 && (
        <div className="chatmode__welcome">
          <div className={`chatmode__welcome-icon chatmode__welcome-icon--${cfg.color}`}>
            {cfg.icon}
          </div>
          <h2 className="chatmode__welcome-title">{cfg.title}</h2>
          <p className="chatmode__welcome-desc">{cfg.desc}</p>

          <div className="chatmode__chips">
            {modeId === "learn" && [
              "Should AI replace teachers?",
              "Is remote work better?",
              "Should junk food be banned?",
            ].map((ex) => (
              <button key={ex} className="chatmode__chip" onClick={() => setInput(ex)}>
                {ex}
              </button>
            ))}
            {modeId === "counter" && [
              "Social media is harmless for teens",
              "Homework improves grades",
              "Electric cars are always better",
            ].map((ex) => (
              <button key={ex} className="chatmode__chip" onClick={() => setInput(ex)}>
                {ex}
              </button>
            ))}
            {modeId === "evaluate" && [
              "We should ban single-use plastics",
              "Universities should be free",
              "Space exploration wastes money",
            ].map((ex) => (
              <button key={ex} className="chatmode__chip" onClick={() => setInput(ex)}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chatmode__messages">
        {messages.map((msg) => (
          <Message key={msg.id} msg={msg} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <div className="chatmode__inputbar">
        <div className={`chatmode__inputbar-inner chatmode__inputbar-inner--${cfg.color}`}>
          <textarea
            ref={textareaRef}
            className="chatmode__textarea"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKey}
            placeholder={cfg.placeholder}
            rows={1}
            disabled={loading}
          />
          <button
            className={`chatmode__send chatmode__send--${cfg.color}`}
            onClick={send}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <span className="chatmode__send-spinner" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
        <p className="chatmode__hint">
          <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}