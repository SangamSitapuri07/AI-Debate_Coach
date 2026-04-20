import { useState, useRef } from "react";

export default function InputBox({ onSend, isLoading, placeholder }) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);

  // Auto-resize textarea
  const handleChange = (e) => {
    setText(e.target.value);
    
    // Auto-resize
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
    }
  };

  // Submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!text.trim() || isLoading) return;
    
    // Call parent handler
    onSend(text.trim());
    
    // Clear input
    setText("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // Handle Enter key (Shift+Enter for new line)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="input-box">
      <form className="input-box__form" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="input-box__textarea"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type your message..."}
          rows={1}
          disabled={isLoading}
          autoFocus
        />
        <button
          type="submit"
          className="input-box__send"
          disabled={!text.trim() || isLoading}
          title="Send message"
        >
          {isLoading ? "..." : "➤"}
        </button>
      </form>
      <div className="input-box__hint">
        Press <strong>Enter</strong> to send • <strong>Shift+Enter</strong> for new line
      </div>
    </div>
  );
}