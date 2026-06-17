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
  'turmeric-soap': { name: 'Turmeric Soap', price: 349 }
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

    let shipping = SHIPPING_FEE;

    // ✅ FREE SHIPPING PROMO CHECK
    if (promo?.type === "free_shipping") {
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

    // only add shipping if not free
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
