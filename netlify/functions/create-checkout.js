const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SHIPPING_FEE = 399;
const FREE_SHIPPING_THRESHOLD = 3000;

const PRODUCTS = {
  'hair-growth-oil-100ml': { name: 'Hair Growth Oil', price: 999 },
  'satin-bonnet': { name: 'Satin Bonnet', price: 299 },
  'rosemary-hair-oil-60ml': { name: 'Rosemary Hair Oil', price: 499 },
  'shampoo': { name: 'Nourishing Shampoo', price: 1299 },
  'conditioner': { name: 'Deep Conditioner', price: 999 },
  'pomade': { name: 'Pomade', price: 499 },
  'sisal-soap-bag': { name: 'Sisal Soap Bag', price: 259 },
  'turmeric-soap': { name: 'Turmeric Soap', price: 349 },
  'silk-and-shine': { name: 'Silk and Shine Bundle', price: 1799 },
  'silk-and-shine-set': { name: 'Silk and Shine Bundle', price: 1799 },
  'wash-set': { name: 'Wash Bundle', price: 1599 },
  'blow-dry-set': { name: 'Blowdryer Bundle', price: 2799 },
  'silk-care-trio': { name: 'Silk Care Trio', price: 3299 },
  'root-revival-duo': { name: 'Root Revival Duo', price: 2499 },
  'botanical-growth-duo': { name: 'Botanical Growth Duo', price: 1399 },
  'kids-set': { name: 'Kids Set', price: 2499 },
  'premium-hair-collection': { name: 'Premium Hair Collection', price: 3799 },
  'conditioner-150-ml': { name: 'Nourishing Conditioner 150ml', price: 999 },
};

const PROMO_CODES = {
  IBMCHURCH: { type: 'free_shipping' },
  AMHALF: { type: 'oil_half_price' },
};

const AMHALF_OIL_IDS = [
  'rosemary-hair-oil-60ml',
  'hair-growth-oil-100ml',
];

function normalisePromoCode(code) {
  return String(code || '').trim().toUpperCase();
}

function getValidPromo(promo) {
  if (!promo || typeof promo !== 'object') return null;

  const code = normalisePromoCode(promo.code);
  if (!code) return null;

  const definition = PROMO_CODES[code];
  if (!definition) return null;

  return { code, ...definition };
}

function getSafeCart(cart) {
  return cart.map((item) => {
    const product = PRODUCTS[item?.id];
    if (!product) throw new Error('Unknown product: ' + String(item?.id || 'missing-id'));

    return {
      id: item.id,
      qty: Math.max(1, Math.floor(Number(item.qty) || 1)),
      product,
    };
  });
}

function buildCheckoutLines(safeCart, amHalfActive) {
  // cart.js calculates AMHALF using the exact 50% value first, then rounds
  // the final cart total to 2 decimal places. Because Stripe only accepts
  // whole pennies, we reproduce that same final-total rounding here and
  // distribute any leftover penny across discounted lines.
  const pricedLines = safeCart.map((item) => {
    const isAmHalfOil = amHalfActive && AMHALF_OIL_IDS.includes(item.id);
    const rawAmount = isAmHalfOil
      ? item.product.price * item.qty * 0.5
      : item.product.price * item.qty;

    return {
      ...item,
      isAmHalfOil,
      rawAmount,
      stripeAmount: Math.floor(rawAmount),
    };
  });

  const rawMerchandiseTotal = pricedLines.reduce(
    (sum, line) => sum + line.rawAmount,
    0
  );

  const targetMerchandiseTotal = Math.round(rawMerchandiseTotal);
  const flooredTotal = pricedLines.reduce(
    (sum, line) => sum + line.stripeAmount,
    0
  );

  let penniesToDistribute = targetMerchandiseTotal - flooredTotal;

  // Only fractional AMHALF lines can need the extra penny.
  for (const line of pricedLines) {
    if (penniesToDistribute <= 0) break;

    if (line.isAmHalfOil && !Number.isInteger(line.rawAmount)) {
      line.stripeAmount += 1;
      penniesToDistribute -= 1;
    }
  }

  if (penniesToDistribute !== 0) {
    throw new Error('Unable to reconcile checkout total');
  }

  return {
    pricedLines,
    rawMerchandiseTotal,
    targetMerchandiseTotal,
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod && event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: {
          Allow: 'POST',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid checkout request' }),
      };
    }

    const { cart, promo } = payload;

    if (!Array.isArray(cart) || cart.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Cart is empty' }),
      };
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured');
    }

    const safeCart = getSafeCart(cart);
    const validPromo = getValidPromo(promo);
    const amHalfActive = validPromo?.type === 'oil_half_price';

    const {
      pricedLines,
      rawMerchandiseTotal,
      targetMerchandiseTotal,
    } = buildCheckoutLines(safeCart, amHalfActive);

    const line_items = pricedLines.map((line) => {
      const { product, qty, isAmHalfOil, stripeAmount } = line;

      if (isAmHalfOil) {
        // Keep the full discounted line as quantity 1 so Stripe can represent
        // totals such as 50% of £4.99 without forcing a per-item half-penny.
        return {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `${product.name} × ${qty} — AMHALF 50% off`,
            },
            unit_amount: stripeAmount,
          },
          quantity: 1,
        };
      }

      return {
        price_data: {
          currency: 'gbp',
          product_data: { name: product.name },
          unit_amount: product.price,
        },
        quantity: qty,
      };
    });

    let shipping = SHIPPING_FEE;

    // Use the unrounded merchandise amount here because cart.js checks the
    // exact discounted cart total before deciding whether shipping is free.
    if (
      validPromo?.type === 'free_shipping' ||
      rawMerchandiseTotal >= FREE_SHIPPING_THRESHOLD
    ) {
      shipping = 0;
    }

    if (shipping > 0) {
      line_items.push({
        price_data: {
          currency: 'gbp',
          product_data: { name: 'Shipping' },
          unit_amount: shipping,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      metadata: {
        promo_code: validPromo?.code || '',
        share_key: String(promo?.shareKey || '').slice(0, 100),
        merchandise_total_pence: String(targetMerchandiseTotal),
      },
      success_url:
        'https://amhairandbeauty.com/success?success=true&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://amhairandbeauty.com/cart/',
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Checkout error:', err);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: err?.message || 'Checkout failed',
      }),
    };
  }
};
