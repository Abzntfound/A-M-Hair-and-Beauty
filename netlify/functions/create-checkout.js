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
  'blow-dry-set': { name: 'Blowdryer Bundle', price: 2499 },
  'silk-care-trio': { name: 'Silk Care Trio', price: 2499 },
  'complete-blow-dry-kit': { name: 'Complete Blow Dryer Kit', price: 2799 },
  'root-revival-duo': { name: 'Root Revival Duo', price: 2499 },
  'botanical-growth-duo': { name: 'Botanical Growth Duo', price: 1399 },
  'complete-care': { name: 'A&M Complete Care Package', price: 6499 },
  'kids-set': { name: 'Kids Set', price: 2499 },
};

// Mirrors PROMO_CODES in cart.js — server is the source of truth.
// Never trust a `type` flag sent straight from the client.
const PROMO_CODES = {
  'IBMCHURCH': { type: 'free_shipping' }
};

exports.handler = async (event) => {
  try {
    const { cart, promo } = JSON.parse(event.body || "{}");

    if (!Array.isArray(cart) || cart.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Cart is empty" })
      };
    }

    // Re-validate the promo code against the server's own list —
    // ignore promo.type from the client entirely.
    const validPromo = promo?.code ? PROMO_CODES[promo.code.toUpperCase()] : null;

    let shipping = SHIPPING_FEE;
    if (validPromo?.type === "free_shipping") {
      shipping = 0;
    }

    const line_items = [];
    for (const item of cart) {
      const product = PRODUCTS[item.id];
      if (!product) throw new Error("Unknown product: " + item.id);

      line_items.push({
        price_data: {
          currency: 'gbp',
          product_data: { name: product.name },
          unit_amount: product.price,
        },
        quantity: item.qty || 1,
      });
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
      success_url: 'https://amhairandbeauty.com/success/',
      cancel_url: 'https://amhairandbeauty.com/cart/',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
