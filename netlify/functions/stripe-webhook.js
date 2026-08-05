import Stripe from "stripe";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

        const email = session.customer_details?.email || "";
        const name = session.customer_details?.name || "";
        const amount = (session.amount_total || 0) / 100;

        // Generate order number
        const orderNumber =
            "AM" +
            Date.now().toString().slice(-8);

        // Save order to Supabase
        const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

if (!existing) {

    await supabase
        .from("orders")
        .insert({
            order_number: orderNumber,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            customer_name: name,
            customer_email: email,
            total: amount,
            status: "processing"
        });

}

        if (error) {
            console.error("Supabase Error:", error);
        }

        // Email yourself
try {

    await resend.emails.send({
        from: "A&M Orders <onboarding@resend.dev>",
        to: "adube6113@outlook.com",
        subject: `New Order ${orderNumber}`,
        html: `...`
    });

} catch (err) {

    console.error("Email failed:", err);

}

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
    };
};
