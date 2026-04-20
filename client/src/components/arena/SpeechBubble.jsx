import { useState, useEffect } from "react";

export default function SpeechBubble({ text, speaker, isVisible }) {
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!text || !isVisible) {
      setDisplayed("");
      setTyping(false);
      return;
    }

    setTyping(true);
    setDisplayed("");

    const words = text.split(" ");
    let i = 0;

    const timer = setInterval(() => {
      if (i < words.length) {
        setDisplayed(words.slice(0, i + 1).join(" "));
        i++;
      } else {
        setTyping(false);
        clearInterval(timer);
      }
    }, 70);

    return () => clearInterval(timer);
  }, [text, isVisible]);

  if (!isVisible || !text) return null;

  const words = displayed.split(" ");
  const truncated = words.slice(0, 30).join(" ");
  const hasMore = words.length > 30;

  return (
    <div className={`speech-bubble speech-bubble--${speaker}`}>
      <div className="speech-inner">
        <div className="speech-speaker">
          {speaker === "human" ? "👤 You" : "🤖 AI"}
        </div>
        <div className="speech-text">
          {truncated}
          {hasMore && "..."}
          {typing && <span className="speech-cursor">▌</span>}
        </div>
      </div>
      {/* Tail points DOWN toward character head */}
      <div className="speech-tail" />
    </div>
  );
}