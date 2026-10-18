import { createClientFromRequest, serve } from '../_shared/backend.js';

// Admin > Tài khoản: the site's accounts, banning, and who is an admin. Signed-in admins only.
// A ban is set in Supabase Auth (the account can no longer sign in or renew its session) and copied
// to profiles.banned_at so the site signs a banned visitor out on their next page load.
// Nobody can ban or demote themselves, so the site always keeps at least one admin.
const FOREVER = '876000h';   // 100 years: Supabase Auth has no "permanent" value
const MAX_PAGES = 20;        // 20 × 1,000 accounts

const fail = (status, error) => Response.json({ error }, { status });

async function allAccounts(authAdmin) {
  const users = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await authAdmin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < 1000) break;
  }
  return users;
}

const bannedNow = (u) => Boolean(u?.banned_until && new Date(u.banned_until).getTime() > Date.now());

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    let me = null;
    try { me = await base44.auth.me(); } catch { me = null; }
    if (!me) return fail(401, 'Unauthorized');
    if (me.role !== 'admin') return fail(403, 'Forbidden');

    const db = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'list') {
      const [users, profiles, purchases] = await Promise.all([
        allAccounts(db.authAdmin),
        db.entities.Profiles.list(),
        db.entities.EbookPurchase.filter({ payment_status: 'paid' }),
      ]);
      const profileOf = new Map(profiles.map((p) => [p.id, p]));
      const bought = new Map();
      for (const p of purchases) if (p.user_id) bought.set(p.user_id, (bought.get(p.user_id) || 0) + 1);
      const items = users.map((u) => {
        const p = profileOf.get(u.id) || {};
        return {
          id: u.id,
          email: u.email || p.email || '',
          full_name: p.full_name || '',
          role: p.role || 'user',
          created_at: u.created_at || p.created_date || null,
          last_sign_in_at: u.last_sign_in_at || null,
          banned: bannedNow(u) || Boolean(p.banned_at),
          purchases: bought.get(u.id) || 0,
          is_me: u.id === me.id,
        };
      }).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return Response.json({ items });
    }

    // The account to act on: by id, or (granting admin) by email.
    let target = null;
    if (body.id) {
      [target] = await db.entities.Profiles.filter({ id: String(body.id) });
    } else if (body.email) {
      const email = String(body.email).trim().toLowerCase();
      const profiles = await db.entities.Profiles.list();
      target = profiles.find((p) => String(p.email || '').toLowerCase() === email) || null;
      if (!target) return fail(404, `Chưa có tài khoản nào dùng email ${email}. Nhờ người đó đăng ký trên web trước, rồi cấp quyền lại.`);
    }
    if (!target) return fail(404, 'Không tìm thấy tài khoản.');
    if (target.id === me.id) return fail(400, 'Bạn không thể tự đổi quyền hay tự chặn tài khoản của mình.');

    if (action === 'ban' || action === 'unban') {
      const ban = action === 'ban';
      if (ban && target.role === 'admin') return fail(400, 'Tài khoản này đang là admin. Gỡ quyền admin trước rồi mới chặn được.');
      const { error } = await db.authAdmin.updateUserById(target.id, { ban_duration: ban ? FOREVER : 'none' });
      if (error) throw new Error(error.message);
      await db.entities.Profiles.update(target.id, { banned_at: ban ? new Date().toISOString() : null });
      return Response.json({ ok: true });
    }

    if (action === 'set_role') {
      const role = body.role === 'admin' ? 'admin' : body.role === 'user' ? 'user' : null;
      if (!role) return fail(400, 'Quyền không hợp lệ.');
      if (role === 'admin' && target.banned_at) return fail(400, 'Tài khoản này đang bị chặn. Bỏ chặn trước rồi mới cấp quyền admin.');
      await db.entities.Profiles.update(target.id, { role });
      return Response.json({ ok: true, email: target.email, role });
    }

    return fail(400, 'Unknown action');
  } catch (error) {
    return fail(500, error.message || 'adminUsers failed');
  }
}

serve(handler);
