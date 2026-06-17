const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
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
      body: `Webhook Error: ${err.message}`,
    };
  }

  // ✅ PAYMENT SUCCESS
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    const customerEmail = session.customer_details?.email;
    const amount = session.amount_total / 100;

    // Items you passed in metadata (IMPORTANT)
    const cart = JSON.parse(session.metadata.cart || "[]");

    // =========================
    // SEND EMAIL TO YOU
    // =========================
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: "A&M Orders <orders@amhairandbeauty.com>",
      to: "YOUR_EMAIL@gmail.com",
      subject: "🛍️ New Order Received",
      html: `
        <h2>New Order Paid</h2>
        <p><b>Email:</b> ${customerEmail}</p>
        <p><b>Total:</b> £${amount}</p>
        <h3>Items:</h3>
        <pre>${JSON.stringify(cart, null, 2)}</pre>
      `,
    });

    // OPTIONAL: customer confirmation email
    await transporter.sendMail({
      to: customerEmail,
      subject: "Order Confirmed - A&M Hair & Beauty",
      html: `
        <h2>Thanks for your order</h2>
        <p>Your order has been received and is being prepared.</p>
        <p>We will notify you when it ships.</p>
      `,
    });
  }

  return {
    statusCode: 200,
    body: "OK",
  };
};
