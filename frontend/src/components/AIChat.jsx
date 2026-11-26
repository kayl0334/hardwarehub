
import { useState, useEffect, useRef } from "react";
import { Bot, X, Send, MessageCircle } from "lucide-react";
import "./AIChat.css";

const API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000/api/v1";

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! Welcome to HardwareHub. What hardware products are you looking for today?",
    },
  ]);

  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [messages, loading, open]);

  async function sendMessage(e) {
    e.preventDefault();

    const question = message.trim();

    if (!question || loading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: question },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: question }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error?.message || "Unable to get recommendations."
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result.data.reply,
          products: result.data.products || [],
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, the assistant is unavailable. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hh-ai">
      {open && (
        <section
          className="hh-ai-window"
          aria-label="HardwareHub shopping assistant"
        >
          <header className="hh-ai-header">
            <Bot size={28} />

            <div>
              <strong>HardwareHub Assistant</strong>
              <small>Your smart shopping helper</small>
            </div>

            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
            >
              <X size={22} />
            </button>
          </header>

          <div className="hh-ai-messages" role="log">
            {messages.map((item, index) => (
              <div
                key={index}
                className={`hh-ai-message ${item.role}`}
              >
                <p>{item.text}</p>

                {item.products?.map((product) => (
                  <div
                    className="hh-ai-product"
                    key={product.id}
                  >
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                      />
                    )}

                    <div>
                      <strong>{product.name}</strong>

                      <span>
                        {Number(product.price).toLocaleString(
                          "en-PH",
                          {
                            style: "currency",
                            currency: "PHP",
                          }
                        )}
                      </span>

                      <small>
                        {product.stock} available
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {loading && (
              <div className="hh-ai-message assistant">
                Searching inventory...
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <form
            className="hh-ai-form"
            onSubmit={sendMessage}
          >
            <input
              type="text"
              placeholder="Ask about hardware..."
              aria-label="Your question"
              value={message}
              maxLength={500}
              onChange={(e) => setMessage(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading || !message.trim()}
              aria-label="Send message"
            >
              <Send size={19} />
            </button>
          </form>
        </section>
      )}

      <button
        className="hh-ai-toggle"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
      >
        {open ? <X size={26} /> : <MessageCircle size={28} />}
      </button>
    </div>
  );
}
