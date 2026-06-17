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

    if (stripeEvent.type === "checkout.session.completed") {
        const session = stripeEvent.data.object;

        const email = session.customer_details?.email || "unknown";
        const amount = (session.amount_total || 0) / 100;

        await resend.emails.send({
            from: "A&M Orders <onboarding@resend.dev>",
            to: "adube6113@outlook.com",
            subject: "New Paid Order - A&M Hair & Beauty",
            html: `
                <h2>New Order Paid</h2>
                <p><b>Customer Email:</b> ${email}</p>
                <p><b>Total Paid:</b> £${amount}</p>
                <p><b>Stripe Session:</b> ${session.id}</p>
            `
        });
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
    };
};
