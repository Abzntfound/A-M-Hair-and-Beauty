import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    },
    body: JSON.stringify(body)
  };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const email = String(body.email || "").trim().toLowerCase();
    const trackingCode = String(body.trackingCode || body.lookupCode || "")
      .trim()
      .toUpperCase();

    if (!email || !/^AM-\d{9}$/.test(trackingCode) || email.length > 254) {
      return response(400, { error: "Enter your checkout email and A&M tracking code." });
    }

    // The customer never needs the Royal Mail reference to search A&M.
    // Their permanent AM-123456789 code + Stripe checkout email identifies
    // the order; royal_mail_tracking is simply the carrier reference linked
    // to that order by the store administrator.
    const { data: order, error } = await supabase
      .from("orders")
      .select("order_number,tracking_code,status,royal_mail_tracking")
      .eq("customer_email", email)
      .eq("tracking_code", trackingCode)
      .maybeSingle();

    if (error) throw error;

    if (!order) {
      return response(404, {
        error: "We could not find an order matching that email and A&M tracking code."
      });
    }

    const royalMailTracking = String(order.royal_mail_tracking || "").trim().toUpperCase();

    return response(200, {
      orderNumber: order.order_number,
      trackingCode: order.tracking_code,
      status: order.status || "processing",
      dispatched: Boolean(royalMailTracking),
      royalMailUrl: royalMailTracking
        ? `https://www.royalmail.com/portal/rm/track?trackNumber=${encodeURIComponent(royalMailTracking)}`
        : null
    });
  } catch (err) {
    console.error("Track order error:", err);
    return response(500, { error: "Unable to check your order right now." });
  }
};