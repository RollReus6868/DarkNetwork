import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getChatGuestKey } from "@/lib/chatGuestKey";

const POLL_MS = 5000;
const MAX_BODY = 2000;

function Bubble({ message }) {
  const mine = message.sender_role === "visitor";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          mine
            ? "bg-gradient-to-b from-[#e6c56a] to-[#b58a30] text-[#241406]"
            : "bg-secondary border border-[#e6c56a]/25 text-foreground/90"
        }`}
      >
        {message.body}
      </div>
    </div>
  );
}

// open/onToggle come from FloatingActions, which shows one panel at a time
export default function ChatWidget({ open, onToggle }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("chatGuest", {
        action: "sync",
        guestKey: getChatGuestKey(),
      });
      setMessages(res.data?.messages ?? []);
      setError("");
    } catch {
      // Lỗi tạm thời khi làm mới: giữ nguyên nội dung đang hiển thị
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open]);

  const handleSend = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await base44.functions.invoke("chatGuest", {
        action: "send",
        guestKey: getChatGuestKey(),
        body: body.slice(0, MAX_BODY),
      });
      const saved = res.data?.message;
      if (!saved) throw new Error("not saved");
      setMessages((prev) => [...prev, saved]);
      setDraft("");
    } catch {
      setError("Your message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <div className="absolute bottom-full left-0 mb-3 w-[min(90vw,22rem)] h-[min(60vh,30rem)] flex flex-col rounded overflow-hidden border border-[#e6c56a]/35 bg-[#1a0f08]/97 backdrop-blur shadow-[0_24px_60px_-18px_rgba(0,0,0,0.95)]">
          <div className="flex items-start justify-between gap-3 px-4 py-3.5 border-b border-[#e6c56a]/20 bg-gradient-to-b from-[#2d1810] to-[#1a0f08]">
            <div>
              <p className="font-heading text-lg font-semibold text-[#fbf1dc]">Chat with Dark Network</p>
              <p className="text-[11px] text-foreground/60">Send us a question and we will reply right here.</p>
            </div>
            <button
              type="button"
              onClick={onToggle}
              aria-label="Close chat"
              className="text-foreground/60 hover:text-primary transition-colors mt-0.5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {loading ? (
              <div className="h-full flex items-center justify-center text-foreground/50">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded border border-[#e6c56a]/25 bg-secondary px-3.5 py-3 text-sm text-foreground/80 leading-relaxed">
                Hello! How can we help? Leave a message and we will reply in this conversation.
              </div>
            ) : (
              messages.map((message) => <Bubble key={message.id} message={message} />)
            )}
          </div>

          {error && <p className="px-4 pb-2 text-xs text-destructive">{error}</p>}

          <form onSubmit={handleSend} className="border-t border-[#e6c56a]/20 p-3 flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              rows={1}
              maxLength={MAX_BODY}
              placeholder="Type a message…"
              className="flex-1 resize-none max-h-24 bg-secondary border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Send message"
              className="btn-gold w-10 h-10 rounded flex items-center justify-center disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? "Close chat" : "Open chat"}
        className="btn-chat-glow w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  );
}