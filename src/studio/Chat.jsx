// Customer chat on the phone: the same inbox as Admin > Tin nhắn and the desktop tool.
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Loader2, Send } from "lucide-react";
import { chat } from "./api";
import { Empty, ErrorNote, Loading, when } from "./ui";

export const chatName = (c) => c?.visitor_name || (c?.user_id ? "Khách có tài khoản" : `Khách vãng lai${c?.guest_key ? " · " + c.guest_key.slice(-6) : ""}`);

function Thread({ conv, onBack, onRead }) {
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await chat("thread", { conversationId: conv.id });
        if (!alive) return;
        setMessages((old) => (old && old.length === res.messages.length ? old : res.messages));
        setError("");
        onRead(conv.id);
      } catch (e) { if (alive) setError(e.message); }
    };
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 5000);
    return () => { alive = false; clearInterval(t); };
  }, [conv.id, onRead]);

  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await chat("reply", { conversationId: conv.id, body });
      setMessages((m) => [...(m || []), res.message]);
      setText("");
      setError("");
    } catch (e) { setError(e.message); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-[#120b06]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="flex items-center gap-2 border-b border-white/5 px-2 py-2.5">
        <button onClick={onBack} className="rounded-full p-2 text-[#d4a64a]" aria-label="Quay lại"><ChevronLeft className="h-6 w-6" /></button>
        <b className="min-w-0 flex-1 truncate text-[15px] text-[#f3e9d6]">{chatName(conv)}</b>
      </div>
      <div ref={box} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        <ErrorNote error={error} />
        {!messages ? <Loading /> : messages.map((m) => {
          const mine = m.sender_role === "admin";
          return (
            <div key={m.id} className={`max-w-[82%] rounded-2xl px-3 py-2 text-[14px] ${mine ? "ml-auto rounded-br-md bg-[#d4a64a] text-[#1a0f08]" : "rounded-bl-md bg-white/[0.07] text-[#f3e9d6]"}`}>
              <div className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.body}</div>
              <div className={`mt-0.5 text-[10px] ${mine ? "text-[#1a0f08]/60" : "text-white/40"}`}>{when(m.created_date)}</div>
            </div>
          );
        })}
      </div>
      <div className="flex items-end gap-2 border-t border-white/5 px-3 py-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000} placeholder="Viết câu trả lời…" aria-label="Câu trả lời"
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl bg-white/[0.06] px-3.5 py-2.5 text-[16px] text-[#f3e9d6] outline-none placeholder:text-white/35" />
        <button onClick={send} disabled={!text.trim() || sending} aria-label="Gửi"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d4a64a] text-[#1a0f08] disabled:opacity-40">
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

export function Chat({ list, error, open, setOpen, onRead }) {
  const conv = open && (list || []).find((c) => c.id === open);
  return (
    <div className="space-y-2">
      <ErrorNote error={error} />
      {!list ? <Loading /> : list.length ? list.map((c) => (
        <button key={c.id} onClick={() => setOpen(c.id)} className="flex w-full items-start gap-3 rounded-2xl bg-white/[0.035] p-3.5 text-left ring-1 ring-white/5 active:bg-white/[0.07]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d4a64a]/15 text-sm font-bold text-[#d4a64a]">{chatName(c).slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <b className={`min-w-0 flex-1 truncate text-[14px] ${c.unread_for_admin ? "text-white" : "text-white/75"}`}>{chatName(c)}</b>
              <span className="shrink-0 text-[11px] text-white/40">{when(c.last_message_at)}</span>
            </div>
            <div className={`mt-0.5 line-clamp-2 text-[13px] ${c.unread_for_admin ? "font-semibold text-white/90" : "text-white/50"}`}>{c.last_message_preview}</div>
          </div>
          {c.unread_for_admin ? <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" aria-label="Chưa đọc" /> : null}
        </button>
      )) : <Empty text="Chưa có tin nhắn nào. Khi khách nhắn trên web, cuộc trò chuyện sẽ hiện ở đây." />}
      {conv ? <Thread conv={conv} onBack={() => setOpen("")} onRead={onRead} /> : null}
    </div>
  );
}
