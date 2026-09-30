import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const ebookId = body?.ebook_id;
    // "main" = the purchased ebook, "bonus" = the bundled mini ebook gift.
    const file = body?.file === 'bonus' ? 'bonus' : 'main';
    if (!ebookId) return Response.json({ error: 'Missing ebook_id' }, { status: 400 });

    // Verify the authenticated user owns this ebook with download access.
    const purchases = await base44.entities.EbookPurchase.filter({
      user_id: user.id,
      ebook_id: ebookId,
      download_access: true
    });

    if (!purchases || purchases.length === 0) {
      return Response.json({ error: 'You do not have access to this ebook' }, { status: 403 });
    }

    // Fetch the ebook (service role so we can read the private file URI field).
    const ebook = await base44.asServiceRole.entities.Ebook.get(ebookId);
    const fileUri = file === 'bonus' ? ebook?.bonus_secure_file_uri : ebook?.secure_file_uri;
    if (!ebook || !fileUri) {
      return Response.json({ error: 'Download file is not available for this ebook' }, { status: 404 });
    }

    // Generate a short-lived signed URL for the private file.
    const result = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: fileUri,
      expires_in: 120
    });

    return Response.json({ signed_url: result.signed_url });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to generate download link' }, { status: 500 });
  }
}