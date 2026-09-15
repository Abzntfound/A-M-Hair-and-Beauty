const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function reply(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    },
    body: JSON.stringify(body)
  };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

  try {
    const { sessionId } = JSON.parse(event.body || '{}');
    if (!sessionId || !String(sessionId).startsWith('cs_')) {
      return reply(400, { error: 'Invalid checkout session' });
    }

    // Verify the supplied ID is a genuine completed Stripe Checkout Session.
    const session = await stripe.checkout.sessions.retrieve(String(sessionId));
    if (session.status !== 'complete') {
      return reply(400, { error: 'Checkout is not complete' });
    }

    // The webhook can arrive a moment after Stripe redirects the browser.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { data: order, error } = await supabase
        .from('orders')
        .select('order_number,lookup_code,status')
        .eq('stripe_session_id', session.id)
        .maybeSingle();

      if (error) throw error;
      if (order) {
        return reply(200, {
          orderNumber: order.order_number,
          trackingCode: order.lookup_code,
          status: order.status || 'processing'
        });
      }
      await sleep(750);
    }

    return reply(202, { pending: true });
  } catch (err) {
    console.error('Order confirmation lookup error:', err);
    return reply(500, { error: 'Unable to load order confirmation' });
  }
}; 
