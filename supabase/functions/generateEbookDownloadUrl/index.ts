import { createClientFromRequest, serve } from '../_shared/backend.js';

// Who may download: a signed-in buyer (their own purchases) or a guest holding the secret
// token from their receipt link. { list: true } returns the books instead of a file link.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const token = typeof body?.token === 'string' && body.token.length >= 32 ? body.token : null;

    const owner = { download_access: true };
    if (token) {
      owner.access_token = token;
    } else {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      owner.user_id = user.id;
    }

    if (body?.list) {
      const purchases = await base44.asServiceRole.entities.EbookPurchase.filter(owner);
      const items = [];
      for (const purchase of purchases) {
        const ebook = await base44.asServiceRole.entities.Ebook.get(purchase.ebook_id).catch(() => null);
        if (!ebook) continue;
        items.push({
          id: ebook.id,
          title: ebook.title,
          subtitle: ebook.subtitle,
          cover_image: ebook.cover_image,
          has_bonus: Boolean(ebook.bonus_secure_file_uri),
          purchase_date: purchase.purchase_date
        });
      }
      return Response.json({ items });
    }

    const ebookId = body?.ebook_id;
    // "main" = the purchased ebook, "bonus" = the bundled mini ebook gift.
    const file = body?.file === 'bonus' ? 'bonus' : 'main';
    if (!ebookId) return Response.json({ error: 'Missing ebook_id' }, { status: 400 });

    const purchases = await base44.asServiceRole.entities.EbookPurchase.filter({ ...owner, ebook_id: ebookId });
    if (!purchases || purchases.length === 0) {
      return Response.json({ error: 'You do not have access to this ebook' }, { status: 403 });
    }

    const ebook = await base44.asServiceRole.entities.Ebook.get(ebookId).catch(() => null);
    const fileUri = file === 'bonus' ? ebook?.bonus_secure_file_uri : ebook?.secure_file_uri;
    if (!ebook || !fileUri) {
      return Response.json({ error: 'Download file is not available for this ebook' }, { status: 404 });
    }

    // Short-lived signed URL for the private file.
    const result = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: fileUri,
      expires_in: 120
    });

    return Response.json({ signed_url: result.signed_url });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to generate download link' }, { status: 500 });
  }
}

serve(handler);
