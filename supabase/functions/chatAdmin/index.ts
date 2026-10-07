import { createClientFromRequest, serve } from '../_shared/backend.js';
import { chatList, chatReply, chatThread } from '../_shared/chat.js';

// Chỉ quản trị viên: xem danh sách hội thoại, đọc luồng và trả lời khách.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const db = base44.asServiceRole.entities;
    const payload = await req.json().catch(() => ({}));
    const action = payload.action;
    const conversationId = String(payload.conversationId ?? '');

    if (action === 'list') return Response.json({ conversations: await chatList(db) });

    if (action === 'thread') {
      if (!conversationId) return Response.json({ error: 'Missing conversation' }, { status: 400 });
      return Response.json({ messages: await chatThread(db, conversationId) });
    }

    if (action === 'reply') {
      const message = await chatReply(db, conversationId, payload.body, { id: user.id, name: user.full_name });
      if (!message) return Response.json({ error: 'Missing conversation or message' }, { status: 400 });
      return Response.json({ message });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

serve(handler);
