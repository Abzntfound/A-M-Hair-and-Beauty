import Stripe from "stripe";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export const handler = async (event) => {
    const sig = event.headers["stripe-signature"];

    let stripeEvent;

    try {
        stripeEvent = stripe.webhooks.constructEvent(
            event.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return {
            statusCode: 400,
            body: `Webhook Error: ${err.message}`
        };
    }

    // PAYMENT SUCCESS
    if (stripeEvent.type === "checkout.session.completed") {
        const session = stripeEvent.data.object;

        const email = session.customer_details?.email;
        const amount = session.amount_total / 100;

        // EMAIL TO YOU
        await resend.emails.send({
            from: "orders@yourdomain.com",
            to: "your-email@gmail.com",
            subject: "New Order Paid",
            html: `
                <h2>New Order Paid</h2>
                <p><b>Email:</b> ${email}</p>
                <p><b>Amount:</b> £${amount}</p>
                <p><b>Session ID:</b> ${session.id}</p>
            `
        });
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
    };
};
