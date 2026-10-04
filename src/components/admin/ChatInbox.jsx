import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";

const LIST_POLL_MS = 10000;
const THREAD_POLL_MS = 5000;

function timeLabel(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function visitorLabel(conversation) {
  if (conversation.visitor_name) return conversation.visitor_name;
  if (conversation.user_id) return "Khách đã đăng nhập";
  const tail = conversation.guest_key ? conversation.guest_key.slice(-6) : "";
  return tail ? `Khách ẩn danh · ${tail}` : "Khách ẩn danh";
}

export default function ChatInbox() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  const loadList = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("chatAdmin", { action: "list" });
      setConversations(res.data?.conversations ?? []);
    } catch {
      // giữ danh sách hiện tại khi làm mới lỗi
    } finally {
      setLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await base44.functions.invoke("chatAdmin", { action: "thread", conversationId: id });
      setMessages(res.data?.messages ?? []);
    } catch {
      // giữ luồng hiện tại khi làm mới lỗi
    }
  }, []);

  useEffect(() => {
    loadList();
    const timer = setInterval(loadList, LIST_POLL_MS);
    return () => clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  useEffect(() => {
    if (!activeId) return;
    loadThread(activeId);
    const timer = setInterval(() => loadThread(activeId), THREAD_POLL_MS);
    return () => clearInterval(timer);
  }, [activeId, loadThread]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const handleReply = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await base44.functions.invoke("chatAdmin", {
        action: "reply",
        conversationId: activeId,
        body,
      });
      const saved = res.data?.message;
      if (!saved) throw new Error("not saved");
      setMessages((prev) => [...prev, saved]);
      setDraft("");
      loadList();
    } catch {
      setError("Không gửi được trả lời. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded border border-border bg-card/40 px-5 py-12 text-center text-muted-foreground">
        Chưa có cuộc trò chuyện nào. Tin nhắn của khách sẽ xuất hiện ở đây.
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[17rem_1fr] gap-5">
      <div className="border border-border rounded bg-card/40 max-h-[32rem] overflow-y-auto">
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveId(c.id)}
            className={`w-full text-left px-4 py-3 border-b border-border/60 last:border-b-0 transition-colors ${
              activeId === c.id ? "bg-secondary" : "hover:bg-secondary/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${c.unread_for_admin ? "bg-primary" : "bg-transparent"}`} />
              <span className="text-sm font-semibold truncate">{visitorLabel(c)}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-1">{c.last_message_preview || "—"}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mt-1">{timeLabel(c.last_message_at)}</p>
          </button>
        ))}
      </div>

      <div className="border border-border rounded bg-card/40 flex flex-col h-[32rem]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Chưa có tin nhắn trong cuộc trò chuyện này.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    m.sender_role === "admin"
                      ? "btn-gold"
                      : "bg-secondary border border-border text-foreground/90"
                  }`}
                >
                  {m.body}
                  <span className="block text-[10px] opacity-60 mt-1">{timeLabel(m.created_date)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {error && <p className="px-4 pb-2 text-xs text-destructive">{error}</p>}

        <form onSubmit={handleReply} className="border-t border-border p-3 flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleReply(e);
              }
            }}
            rows={2}
            placeholder="Trả lời khách…"
            className="flex-1 resize-none bg-secondary border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
          />
          <button type="submit" disabled={sending || !draft.trim()} className="btn-gold px-4 py-2.5 rounded uppercase text-xs tracking-wide disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}