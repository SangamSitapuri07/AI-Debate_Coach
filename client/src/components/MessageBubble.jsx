import ReactMarkdown from "react-markdown";

export default function MessageBubble({ message }) {
  const { role, content, isError, rejected } = message;
  const isUser = role === "user";

  let className = `message message--${role}`;
  if (isError) className += " message--error";
  if (rejected) className += " message--rejected";

  return (
    <div className={className}>
      <div className="message__avatar">
        {isUser ? "👤" : "🤖"}
      </div>
      <div className="message__content">
        {isUser ? (
          <p>{content}</p>
        ) : (
          <ReactMarkdown>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}