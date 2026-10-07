// The owner's side of the customer chat, shared by the website's admin page (chatAdmin)
// and the desktop tool (toolApi). db = full-access entities; callers check who is asking.
const MAX_BODY = 2000;
const PREVIEW_LEN = 140;
const MAX_THREAD = 300;

export async function chatList(db) {
  const conversations = await db.ChatConversation.list({ sort: '-last_message_at', limit: 100 });
  return conversations.items ?? [];
}

// Reading a thread marks the visitor's messages as read.
export async function chatThread(db, conversationId) {
  const thread = await db.ChatMessage.filter({ conversation_id: conversationId }, { sort: 'created_date', limit: MAX_THREAD });
  const messages = thread.items ?? [];
  const unread = messages.filter((m) => m.sender_role === 'visitor' && !m.read_by_admin);
  if (unread.length > 0) {
    for (const message of unread) await db.ChatMessage.update(message.id, { read_by_admin: true });
    await db.ChatConversation.update(conversationId, { unread_for_admin: false });
  }
  return messages;
}

// sender: { id, name } of whoever answers for the site. Returns null when there is nothing to send.
export async function chatReply(db, conversationId, text, sender) {
  const body = String(text ?? '').trim().slice(0, MAX_BODY);
  if (!conversationId || !body) return null;
  const message = await db.ChatMessage.create({
    conversation_id: conversationId,
    sender_role: 'admin',
    sender_user_id: sender.id ?? null,
    sender_name: sender.name,
    body,
    read_by_admin: true,
    read_by_visitor: false,
  });
  await db.ChatConversation.update(conversationId, {
    last_message_at: new Date().toISOString(),
    last_message_preview: body.slice(0, PREVIEW_LEN),
    unread_for_admin: false,
  });
  return message;
}
