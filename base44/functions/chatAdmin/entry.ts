import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const MAX_BODY = 2000;
const PREVIEW_LEN = 140;
const MAX_THREAD = 300;

// Chỉ quản trị viên: xem danh sách hội thoại, đọc luồng và trả lời khách.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const db = base44.asServiceRole.entities;
    const payload = await req.json().catch(() => ({}));
    const action = payload.action;

    if (action === 'list') {
      const conversations = await db.ChatConversation.list({ sort: '-last_message_at', limit: 100 });
      return Response.json({ conversations: conversations.items ?? [] });
    }

    if (action === 'thread') {
      const conversationId = String(payload.conversationId ?? '');
      if (!conversationId) return Response.json({ error: 'Missing conversation' }, { status: 400 });

      const thread = await db.ChatMessage.filter(
        { conversation_id: conversationId },
        { sort: 'created_date', limit: MAX_THREAD }
      );
      const messages = thread.items ?? [];

      const unread = messages.filter((m) => m.sender_role === 'visitor' && !m.read_by_admin);
      if (unread.length > 0) {
        for (const message of unread) {
          await db.ChatMessage.update(message.id, { read_by_admin: true });
        }
        await db.ChatConversation.update(conversationId, { unread_for_admin: false });
      }

      return Response.json({ messages });
    }

    if (action === 'reply') {
      const conversationId = String(payload.conversationId ?? '');
      const body = String(payload.body ?? '').trim().slice(0, MAX_BODY);
      if (!conversationId || !body) {
        return Response.json({ error: 'Missing conversation or message' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const message = await db.ChatMessage.create({
        conversation_id: conversationId,
        sender_role: 'admin',
        sender_user_id: user.id,
        sender_name: user.full_name,
        body,
        read_by_admin: true,
        read_by_visitor: false,
      });
      await db.ChatConversation.update(conversationId, {
        last_message_at: now,
        last_message_preview: body.slice(0, PREVIEW_LEN),
        unread_for_admin: false,
      });

      return Response.json({ message });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}