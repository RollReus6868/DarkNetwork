import { createClientFromRequest, secrets, serve } from '../_shared/backend.js';

const API = () => secrets.get('LEMON_SQUEEZY_API_URL') || 'https://api.lemonsqueezy.com';
const headers = (apiKey) => ({
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/vnd.api+json',
  'Accept': 'application/vnd.api+json'
});

// One checkout for one or several ebooks ({ ebook_id } or { ebook_ids: [...] }).
// Signed-in buyers get the books in /account; guests get a private /download link.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch {}

    const body = await req.json();
    const ids = [...new Set([].concat(body?.ebook_ids || body?.ebook_id || []).map(String))];
    if (ids.length === 0) return Response.json({ error: 'Missing ebook_id' }, { status: 400 });

    // SERVER-SIDE AUTHORITY: titles, prices and the variant come from the database, never the client
    const ebooks = [];
    for (const id of ids) {
      const ebook = await base44.asServiceRole.entities.Ebook.get(id).catch(() => null);
      if (!ebook) return Response.json({ error: 'Ebook not found' }, { status: 404 });
      if (ebook.status !== 'published') return Response.json({ error: `"${ebook.title}" is not available for purchase` }, { status: 400 });
      if (!ebook.lemon_squeezy_variant_id) return Response.json({ error: 'Ebook is not configured for checkout. Please contact support.' }, { status: 400 });
      ebooks.push(ebook);
    }

    const origin = req.headers.get('origin') || secrets.get('SITE_URL') || '';
    const apiKey = secrets.get('LEMON_SQUEEZY_API_KEY');
    const storeId = secrets.get('LEMON_SQUEEZY_STORE_ID');
    if (!apiKey) return Response.json({ error: 'Payment provider not configured' }, { status: 500 });
    if (!storeId) return Response.json({ error: 'Store ID not configured' }, { status: 500 });

    // Guests have no library: this secret, sent only in their receipt, opens their downloads.
    const accessToken = user ? null : crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
    const after = user ? '/account' : `/download?token=${accessToken}`;
    const single = ebooks.length === 1;
    const cents = ebooks.reduce((sum, e) => sum + Math.round(Number(e.price) * 100), 0);

    const createCheckout = (variantId) => fetch(`${API()}/v1/checkouts`, {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_options: { embed: true, dark: true },
            checkout_data: {
              ...(user?.email ? { email: user.email } : {}),
              custom: {
                ebook_ids: ids.join(','),
                user_id: user?.id || 'guest',
                ...(accessToken ? { access_token: accessToken } : {})
              }
            },
            product_options: {
              // One shared Lemon Squeezy product serves every ebook: the name, description and
              // price shown at checkout and on the receipt come from this site's database.
              name: single ? ebooks[0].title : `${ebooks.length} ebooks from Dark Network`,
              ...(single ? {} : { description: ebooks.map((e) => `• ${e.title}`).join('<br>') }),
              redirect_url: `${origin}${after}`,
              receipt_button_text: single ? 'Download your ebook' : 'Download your ebooks',
              receipt_link_url: `${origin}${after}`,
              receipt_thank_you_note: user
                ? 'Thank you! Log in to your Dark Network account to download from My Library.'
                : 'Thank you! Use the button in this email to download. Keep this email: the link is your key to the files.'
            },
            ...(cents > 0 ? { custom_price: cents } : {})
          },
          relationships: {
            store: { data: { type: 'stores', id: storeId } },
            variant: { data: { type: 'variants', id: String(variantId) } }
          }
        }
      })
    });

    let variantId = ebooks[0].lemon_squeezy_variant_id;
    let checkoutResponse = await createCheckout(variantId);
    if (checkoutResponse.status === 404) {
      // The stored number may be a PRODUCT id (easy to copy by mistake): use that product's variant.
      const found = await fetch(`${API()}/v1/variants?filter[product_id]=${encodeURIComponent(variantId)}`, { headers: headers(apiKey) });
      const variant = found.ok ? (await found.json())?.data?.find((v) => v?.attributes?.status !== 'draft') : null;
      if (variant?.id) {
        variantId = variant.id;
        checkoutResponse = await createCheckout(variantId);
      }
    }

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      return Response.json({ error: 'Failed to create checkout session', details: errorText }, { status: 502 });
    }

    const checkoutData = await checkoutResponse.json();
    const checkoutUrl = checkoutData?.data?.attributes?.url;
    if (!checkoutUrl) return Response.json({ error: 'No checkout URL returned' }, { status: 502 });

    // after = where the site sends the buyer once paid; test_mode = not taking real payments
    return Response.json({ url: checkoutUrl, after, test_mode: checkoutData?.data?.attributes?.test_mode, variant_id: String(variantId) });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to create checkout' }, { status: 500 });
  }
}

serve(handler);
