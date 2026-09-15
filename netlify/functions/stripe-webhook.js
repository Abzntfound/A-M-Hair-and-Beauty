import Stripe from "stripe";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function makeOrderNumber() {
  return `AM${Date.now().toString().slice(-8)}`;
}

function makeLookupCode() {
  // Customer-facing code. This is NOT the Royal Mail tracking number.
  return `AM-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

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
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type !== "checkout.session.completed") {
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  try {
    const session = stripeEvent.data.object;
    const email = String(session.customer_details?.email || session.customer_email || "")
      .trim()
      .toLowerCase();
    const name = String(session.customer_details?.name || "").trim();
    const amount = (session.amount_total || 0) / 100;

    if (!email) {
      console.error("Stripe checkout completed without a customer email", session.id);
      return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    const { data: existing, error: existingError } = await supabase
      .from("orders")
      .select("id, order_number, lookup_code")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (existingError) throw existingError;

    let orderNumber = existing?.order_number;
    let lookupCode = existing?.lookup_code;

    if (!existing) {
      orderNumber = makeOrderNumber();
      lookupCode = makeLookupCode();

      const { error: insertError } = await supabase.from("orders").insert({
        order_number: orderNumber,
        lookup_code: lookupCode,
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent || null,
        customer_name: name,
        customer_email: email,
        total: amount,
        status: "processing",
        royal_mail_tracking: null
      });

      if (insertError) throw insertError;
    }

    try {
      await resend.emails.send({
        from: "A&M Orders <onboarding@resend.dev>",
        to: "adube6113@outlook.com",
        subject: `New Order ${orderNumber}`,
        html: `<h2>New A&amp;M order</h2><p><strong>Order:</strong> ${orderNumber}</p><p><strong>Customer:</strong> ${name || "Not supplied"}</p><p><strong>Email:</strong> ${email}</p><p><strong>Total:</strong> £${amount.toFixed(2)}</p><p><strong>Customer tracking code:</strong> ${lookupCode}</p><p>Add the Royal Mail tracking reference to the <code>royal_mail_tracking</code> column in Supabase when the parcel is dispatched.</p>`
      });
    } catch (emailError) {
      console.error("Admin order email failed:", emailError);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    // Returning 500 lets Stripe retry the webhook instead of silently losing the order.
    console.error("Order webhook failed:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Order processing failed" }) };
  }
};