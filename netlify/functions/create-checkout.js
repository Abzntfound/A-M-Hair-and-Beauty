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

const ELIGIBLE_BOGO_HALF_PRICE = [
  'rosemary-hair-oil-60ml',
  'hair-growth-oil-100ml',
];

const AMHALF_OIL_IDS = [
  'rosemary-hair-oil-60ml',
  'hair-growth-oil-100ml',
];

function normalisePromoCode(code) {
  return String(code || '').trim().toUpperCase();
}

function getValidPromo(promo) {
  const code = normalisePromoCode(promo?.code);
  if (!code) return null;
  const definition = PROMO_CODES[code];
  if (!definition) return null;
  return { code, ...definition };
}

function getSafeCart(cart) {
  return cart.map((item) => {
    const product = PRODUCTS[item.id];
    if (!product) throw new Error('Unknown product: ' + item.id);

    return {
      id: item.id,
      qty: Math.max(1, Math.floor(Number(item.qty) || 1)),
      product,
    };
  });
}

function getBogoDiscountedQtyById(cart) {
  const eligibleUnits = [];

  for (const item of cart) {
    if (!ELIGIBLE_BOGO_HALF_PRICE.includes(item.id)) continue;
    for (let i = 0; i < item.qty; i++) {
      eligibleUnits.push({ id: item.id, price: item.product.price });
    }
  }

  const discountQty = Math.floor(eligibleUnits.length / 2);
  const discountedUnits = [...eligibleUnits]
    .sort((a, b) => a.price - b.price)
    .slice(0, discountQty);

  const discountedQtyById = {};
  for (const unit of discountedUnits) {
    discountedQtyById[unit.id] = (discountedQtyById[unit.id] || 0) + 1;
  }
  return discountedQtyById;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod && event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { Allow: 'POST' },
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    const { cart, promo } = JSON.parse(event.body || '{}');

    if (!Array.isArray(cart) || cart.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty' }) };
    }

    const safeCart = getSafeCart(cart);
    const validPromo = getValidPromo(promo);
    const amHalfActive = validPromo?.type === 'oil_half_price';

    // AMHALF overrides the normal BOGO discount so discounts cannot stack.
    const discountedQtyById = amHalfActive ? {} : getBogoDiscountedQtyById(safeCart);

    const line_items = [];
    let merchandiseTotal = 0;

    for (const item of safeCart) {
      const { product, id, qty } = item;

      if (amHalfActive && AMHALF_OIL_IDS.includes(id)) {
        const halfPrice = Math.round(product.price / 2);
        line_items.push({
          price_data: {
            currency: 'gbp',
            product_data: { name: `${product.name} — AMHALF 50% off` },
            unit_amount: halfPrice,
          },
          quantity: qty,
        });
        merchandiseTotal += halfPrice * qty;
        continue;
      }

      const discountedQty = discountedQtyById[id] || 0;
      const fullPriceQty = qty - discountedQty;

      if (fullPriceQty > 0) {
        line_items.push({
          price_data: {
            currency: 'gbp',
            product_data: { name: product.name },
            unit_amount: product.price,
          },
          quantity: fullPriceQty,
        });
        merchandiseTotal += product.price * fullPriceQty;
      }

      if (discountedQty > 0) {
        const halfPrice = Math.round(product.price / 2);
        line_items.push({
          price_data: {
            currency: 'gbp',
            product_data: { name: `${product.name} — 50% off` },
            unit_amount: halfPrice,
          },
          quantity: discountedQty,
        });
        merchandiseTotal += halfPrice * discountedQty;
      }
    }

    let shipping = SHIPPING_FEE;
    if (validPromo?.type === 'free_shipping' || merchandiseTotal >= FREE_SHIPPING_THRESHOLD) {
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
      },
      success_url:
        'https://amhairandbeauty.com/success/?success=true&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://amhairandbeauty.com/cart/',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Checkout error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
