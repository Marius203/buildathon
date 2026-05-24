import { useState, useEffect } from "react";
import { formatText } from "../utils";
import bubbleLogo from "../images/logo.jpg";

const CHIPS = ["🚌 Transport", "🏕️ Cazare", "💰 Buget", "🌧️ Vreme"];

function ChatWindow({ messages, typing, input, onInputChange, onSend, onKeyDown, onChip, messagesEndRef, onFeedback }) {
  return (
    <div className="ec-chat">
      <div className="ec-chat__header">
        <div className="ec-chat__avatar">🏰</div>
        <div style={{ flex: 1 }}>
          <div className="ec-chat__header-name">First-Timer AI</div>
          <div className="ec-chat__header-status">
            <div className="ec-chat__status-dot"/>
            Online acum
          </div>
        </div>
      </div>

      <div className="ec-chat__messages">
        {messages.map((msg, i) => (
          <div key={i} className={`ec-chat__msg-row ec-chat__msg-row--${msg.role}`}>
            {msg.role === "ai" && <div className="ec-chat__msg-avatar">🏰</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "80%" }}>
              <div
                className={`ec-chat__bubble ec-chat__bubble--${msg.role}`}
                dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
              />
              {msg.role === "ai" && msg.index !== undefined && (
                <div style={{ display: "flex", gap: "6px", paddingLeft: "4px" }}>
                  <button
                    onClick={() => onFeedback(msg.index, true)}
                    className={`ec-feedback-btn${msg.feedback === true ? " ec-feedback-btn--pos" : ""}`}
                  >👍</button>
                  <button
                    onClick={() => onFeedback(msg.index, false)}
                    className={`ec-feedback-btn${msg.feedback === false ? " ec-feedback-btn--neg" : ""}`}
                  >👎</button>
                </div>
              )}
            </div>
          </div>
        ))}

        {typing && (
          <div className="ec-chat__msg-row ec-chat__msg-row--ai">
            <div className="ec-chat__msg-avatar">🏰</div>
            <div className="ec-chat__typing">
              {[0, 1, 2].map(i => (
                <div key={i} className="ec-chat__typing-dot" style={{ animationDelay: `${i * 0.15}s` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>

      <div className="ec-chat__chips">
        {CHIPS.map(chip => (
          <button key={chip} className="ec-chat__chip" onClick={() => onChip(chip.slice(3).trim())}>
            {chip}
          </button>
        ))}
      </div>

      <div className="ec-chat__input-row">
        <input
          className="ec-chat__input"
          value={input}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          placeholder="Întreabă orice despre EC..."
        />
        <button className="ec-chat__send" onClick={() => onSend()}>
          <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function ChatBubble({ chatOpen, onToggle, messages, typing, input, onInputChange, onSend, onKeyDown, onChip, messagesEndRef, onFeedback, badge }) {
  const [bubbleHint, setBubbleHint] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setBubbleHint(false), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="ec-bubble-wrap">
      {bubbleHint && !chatOpen && (
        <div className="ec-bubble-hint-box">
          Hei, prima oară la EC? 👋
          <div className="ec-bubble-hint-arrow"/>
        </div>
      )}

      <button
        onClick={onToggle}
        className="ec-bubble-btn"
        style={{
          backgroundImage: chatOpen ? "none" : `url(${bubbleLogo})`,
          backgroundColor: chatOpen ? "var(--ec-black)" : "transparent",
        }}
        aria-label="Deschide asistentul EC"
      >
        {chatOpen && (
          <svg width="28" height="28" fill="none" stroke="var(--ec-white)" strokeWidth="3" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        )}
        {badge && !chatOpen && (
          <div style={{
            position: "absolute", top: "2px", right: "2px",
            width: "14px", height: "14px", borderRadius: "50%",
            background: "var(--ec-yellow)", border: "2px solid var(--ec-black)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}/>
        )}
      </button>

      {chatOpen && (
        <ChatWindow
          messages={messages} typing={typing} input={input}
          onInputChange={onInputChange} onSend={onSend} onKeyDown={onKeyDown}
          onChip={onChip} messagesEndRef={messagesEndRef} onFeedback={onFeedback}
        />
      )}
    </div>
  );
}