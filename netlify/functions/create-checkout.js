const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { cart, shipping } = JSON.parse(event.body);

        if (!cart || cart.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty' }) };
        }

        // Build Stripe line items from cart
        const line_items = cart.map(item => ({
            price_data: {
                currency: 'gbp',
                product_data: {
                    name: item.name,
                    images: [`https://amhairandbeauty.com/${item.image}`],
                },
                unit_amount: Math.round(item.price * 100), // pence
            },
            quantity: item.qty || 1,
        }));

        // Add shipping as a line item if applicable
        if (shipping > 0) {
            line_items.push({
                price_data: {
                    currency: 'gbp',
                    product_data: { name: 'Shipping' },
                    unit_amount: Math.round(shipping * 100),
                },
                quantity: 1,
            });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: 'https://amhairandbeauty.com/success.html',
            cancel_url:  'https://amhairandbeauty.com/cart.html',
            shipping_address_collection: {
                allowed_countries: ['GB'],
            },
        });

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://amhairandbeauty.com',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: session.url }),
        };

    } catch (err) {
        console.error('Stripe error:', err.message);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': 'https://amhairandbeauty.com' },
            body: JSON.stringify({ error: err.message }),
        };
    }
};
