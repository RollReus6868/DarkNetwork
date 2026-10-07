import { createClientFromRequest, secrets, serve } from '../_shared/backend.js';

const MAX_BODY = 2000;
const PREVIEW_LEN = 140;
const MAX_MESSAGES = 200;

// Khách (ẩn danh hoặc đã đăng nhập) chỉ đọc/gửi được trong hội thoại của chính mình:
// danh tính lấy từ token đăng nhập, hoặc từ guest key của phiên trình duyệt.
// Mọi truy cập dữ liệu chạy bằng service role nên RLS của entity vẫn khoá chặt với app user.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }

    const payload = await req.json().catch(() => ({}));
    const action = payload.action;
    const rawKey = typeof payload.guestKey === 'string' ? payload.guestKey : '';
    const guestKey = /^[A-Za-z0-9_-]{8,64}$/.test(rawKey) ? rawKey : null;

    if (!user && !guestKey) {
      return Response.json({ error: 'Missing session' }, { status: 400 });
    }

    const scope = user ? { user_id: user.id } : { guest_key: guestKey };
    const existing = await db.ChatConversation.filter(
      { ...scope, status: 'open' },
      { sort: '-last_message_at', limit: 1 }
    );
    let conversation = (existing.items ?? [])[0] ?? null;

    // how many replies from the site this visitor has not opened yet (badge on the chat button)
    if (action === 'unread') {
      if (!conversation) return Response.json({ unread: 0 });
      return Response.json({ unread: await db.ChatMessage.count({ conversation_id: conversation.id, sender_role: 'admin', read_by_visitor: false }) });
    }

    if (action === 'sync') {
      if (!conversation) return Response.json({ conversation: null, messages: [] });
      const thread = await db.ChatMessage.filter(
        { conversation_id: conversation.id },
        { sort: 'created_date', limit: MAX_MESSAGES }
      );
      const messages = thread.items ?? [];
      // the chat panel is open: the visitor has now seen the replies
      for (const m of messages) {
        if (m.sender_role === 'admin' && !m.read_by_visitor) await db.ChatMessage.update(m.id, { read_by_visitor: true });
      }
      return Response.json({ conversation, messages });
    }

    if (action === 'send') {
      const body = String(payload.body ?? '').trim().slice(0, MAX_BODY);
      if (!body) return Response.json({ error: 'Empty message' }, { status: 400 });

      const now = new Date().toISOString();
      const preview = body.slice(0, PREVIEW_LEN);

      if (!conversation) {
        conversation = await db.ChatConversation.create({
          ...(user ? { user_id: user.id, visitor_name: user.full_name } : { guest_key: guestKey }),
          status: 'open',
          last_message_at: now,
          last_message_preview: preview,
          unread_for_admin: true,
        });
      } else {
        await db.ChatConversation.update(conversation.id, {
          last_message_at: now,
          last_message_preview: preview,
          unread_for_admin: true,
        });
      }

      const message = await db.ChatMessage.create({
        conversation_id: conversation.id,
        sender_role: 'visitor',
        sender_user_id: user ? user.id : null,
        sender_name: user ? user.full_name : null,
        body,
        read_by_admin: false,
        read_by_visitor: true,
      });

      return Response.json({ conversationId: conversation.id, message });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

serve(handler);
