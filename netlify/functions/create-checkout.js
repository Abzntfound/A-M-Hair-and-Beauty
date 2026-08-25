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

const ELIGIBLE_3_FOR_2 = [
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
     * 3-FOR-2
     *
     * These two products count together:
     *
     * 3 Rosemary                  -> pay for 2
     * 3 Hair Growth               -> pay for 2
     * 2 Rosemary + 1 Hair Growth  -> pay for 2
     * 1 Rosemary + 2 Hair Growth  -> pay for 2
     *
     * The cheapest eligible item is free.
     * ==========================================================
     */

    const eligibleItems = cart
      .filter(item => ELIGIBLE_3_FOR_2.includes(item.id))
      .map(item => ({
        id: item.id,
        qty: Math.max(1, Number(item.qty) || 1),
        price: PRODUCTS[item.id].price
      }));

    const totalEligibleQty = eligibleItems.reduce(
      (total, item) => total + item.qty,
      0
    );

    // Exactly 3 eligible products = 1 free.
    let freeItemId = null;

    if (totalEligibleQty === 3) {
      const cheapest = [...eligibleItems].sort(
        (a, b) => a.price - b.price
      )[0];

      freeItemId = cheapest.id;
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

      let chargedQty = requestedQty;

      // Remove one unit from the cheapest eligible product.
      if (item.id === freeItemId) {
        chargedQty = requestedQty - 1;
      }

      // Normal paid quantity.
      if (chargedQty > 0) {
        line_items.push({
          price_data: {
            currency: 'gbp',
            product_data: {
              name: product.name
            },
            unit_amount: product.price
          },
          quantity: chargedQty
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
