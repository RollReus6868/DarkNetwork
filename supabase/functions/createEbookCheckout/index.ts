import { createClientFromRequest, secrets, serve } from '../_shared/backend.js';

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Derive authenticated user from session (optional — guests can buy too)
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {}

    const body = await req.json();
    const ebookId = body?.ebook_id;
    if (!ebookId) return Response.json({ error: 'Missing ebook_id' }, { status: 400 });

    // SERVER-SIDE AUTHORITY: look up the ebook from the database
    // Never trust price, title, or variant_id from the client
    const ebook = await base44.asServiceRole.entities.Ebook.get(ebookId);
    if (!ebook) return Response.json({ error: 'Ebook not found' }, { status: 404 });
    if (ebook.status !== 'published') return Response.json({ error: 'Ebook not available for purchase' }, { status: 400 });
    if (!ebook.lemon_squeezy_variant_id) return Response.json({ error: 'Ebook is not configured for checkout. Please contact support.' }, { status: 400 });

    const origin = req.headers.get('origin') || secrets.get('SITE_URL') || '';
    const apiKey = secrets.get('LEMON_SQUEEZY_API_KEY');
    const storeId = secrets.get('LEMON_SQUEEZY_STORE_ID');
    if (!apiKey) return Response.json({ error: 'Payment provider not configured' }, { status: 500 });
    if (!storeId) return Response.json({ error: 'Store ID not configured' }, { status: 500 });

    // Create Lemon Squeezy checkout with server-side data
    // API format: store + variant must be in relationships, not attributes
    const checkoutResponse = await fetch(`${secrets.get('LEMON_SQUEEZY_API_URL') || 'https://api.lemonsqueezy.com'}/v1/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_options: {
              embed: true,
              dark: true
            },
            checkout_data: {
              custom: {
                ebook_id: ebookId,
                user_id: user?.id || 'guest'
              }
            },
            product_options: {
              // One shared Lemon Squeezy product can serve every ebook: the name shown at
              // checkout and on the receipt always comes from this site's database.
              name: ebook.title,
              redirect_url: `${origin}/books/${ebook.slug}`
            },
            // ...and so does the price (in cents), so the amount charged always matches the page.
            ...(Number(ebook.price) > 0 ? { custom_price: Math.round(Number(ebook.price) * 100) } : {})
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: storeId
              }
            },
            variant: {
              data: {
                type: 'variants',
                id: ebook.lemon_squeezy_variant_id
              }
            }
          }
        }
      })
    });

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      return Response.json({ error: 'Failed to create checkout session', details: errorText }, { status: 502 });
    }

    const checkoutData = await checkoutResponse.json();
    const checkoutUrl = checkoutData?.data?.attributes?.url;

    if (!checkoutUrl) return Response.json({ error: 'No checkout URL returned' }, { status: 502 });

    return Response.json({ url: checkoutUrl });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to create checkout' }, { status: 500 });
  }
}

serve(handler);
