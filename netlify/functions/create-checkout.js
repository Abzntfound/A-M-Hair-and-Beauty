const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SHIPPING_FEE = 399;

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
  IBMCHURCH: { type: 'free_shipping' }
};

const ELIGIBLE_BOGO_HALF_PRICE = [
  'rosemary-hair-oil-60ml',
  'hair-growth-oil-100ml'
];

exports.handler = async (event) => {
  try {
    const { cart, promo } = JSON.parse(event.body || '{}');

    if (!Array.isArray(cart) || cart.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Cart is empty'
        })
      };
    }

    // Validate promo code server-side.
    const validPromo = promo?.code
      ? PROMO_CODES[promo.code.toUpperCase()]
      : null;

    let shipping = SHIPPING_FEE;

    if (validPromo?.type === 'free_shipping') {
      shipping = 0;
    }

   /*
 * ==========================================================
 * BUY 1 GET 1 HALF PRICE
 *
 * Rosemary Hair Oil + Hair Growth Oil count together.
 *
 * 2 eligible items:
 *   cheapest item = 50% off
 *
 * 3 eligible items:
 *   cheapest item = 50% off
 *   remaining 2 = full price
 *
 * 4 eligible items:
 *   2 cheapest items = 50% off
 *
 * The discount is applied to the cheapest eligible
 * items so mixed products work correctly.
 * ==========================================================
 */

const eligibleItems = cart
  .filter(item => ELIGIBLE_BOGO_HALF_PRICE.includes(item.id))
  .map(item => ({
    id: item.id,
    qty: Math.max(1, Number(item.qty) || 1),
    price: PRODUCTS[item.id].price
  }));

const eligibleUnits = [];

for (const item of eligibleItems) {
  for (let i = 0; i < item.qty; i++) {
    eligibleUnits.push({
      id: item.id,
      price: item.price
    });
  }
}

// One half-price item for every pair.
const discountQty = Math.floor(eligibleUnits.length / 2);

// Discount the cheapest eligible units.
const discountedUnits = [...eligibleUnits]
  .sort((a, b) => a.price - b.price)
  .slice(0, discountQty);

// Count discounted units per product.
const discountedQtyById = {};

for (const unit of discountedUnits) {
  discountedQtyById[unit.id] =
    (discountedQtyById[unit.id] || 0) + 1;
}

const line_items = [];

for (const item of cart) {
  const product = PRODUCTS[item.id];

  if (!product) {
    throw new Error('Unknown product: ' + item.id);
  }

  const requestedQty = Math.max(
    1,
    Number(item.qty) || 1
  );

  const discountedQty =
    discountedQtyById[item.id] || 0;

  const fullPriceQty =
    requestedQty - discountedQty;

  // Full-price items
  if (fullPriceQty > 0) {
    line_items.push({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: product.name
        },
        unit_amount: product.price
      },
      quantity: fullPriceQty
    });
  }

  // Half-price items
  if (discountedQty > 0) {
    line_items.push({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: `${product.name} — 50% off`
        },
        unit_amount: Math.round(product.price / 2)
      },
      quantity: discountedQty
    });
  }
}

    if (shipping > 0) {
      line_items.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'Shipping'
          },
          unit_amount: shipping
        },
        quantity: 1
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,

      success_url:
        'https://amhairandbeauty.com/success/?success=true&session_id={CHECKOUT_SESSION_ID}',

      cancel_url:
        'https://amhairandbeauty.com/cart/'
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: session.url
      })
    };

  } catch (err) {
    console.error('Checkout error:', err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};
