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
    const lookupCode = String(body.lookupCode || body.orderNumber || "").trim().toUpperCase();

    if (!email || !lookupCode || email.length > 254 || lookupCode.length > 40) {
      return response(400, { error: "Enter your email and tracking code." });
    }

    // New orders use lookup_code. Keep order_number fallback for older orders.
    let query = supabase
      .from("orders")
      .select("order_number,status,royal_mail_tracking")
      .eq("customer_email", email)
      .eq("lookup_code", lookupCode);

    let { data: order, error } = await query.maybeSingle();

    if (error && /lookup_code|royal_mail_tracking/i.test(error.message || "")) {
      // Helpful during the database migration: old schema can still use the
      // existing order_number + tracking_number fields until columns are added.
      const legacy = await supabase
        .from("orders")
        .select("order_number,status,tracking_number")
        .eq("customer_email", email)
        .eq("order_number", lookupCode)
        .maybeSingle();
      if (legacy.error) throw legacy.error;
      order = legacy.data ? {
        order_number: legacy.data.order_number,
        status: legacy.data.status,
        royal_mail_tracking: legacy.data.tracking_number
      } : null;
      error = null;
    }

    if (error) throw error;

    if (!order) {
      return response(404, {
        error: "We could not find an order matching those details."
      });
    }

    const royalMailTracking = String(order.royal_mail_tracking || "").trim().toUpperCase();

    return response(200, {
      orderNumber: order.order_number,
      status: order.status || "processing",
      dispatched: Boolean(royalMailTracking),
      royalMailTracking: royalMailTracking || null,
      royalMailUrl: royalMailTracking
        ? `https://www.royalmail.com/portal/rm/track?trackNumber=${encodeURIComponent(royalMailTracking)}`
        : null
    });
  } catch (err) {
    console.error("Track order error:", err);
    return response(500, { error: "Unable to check your order right now." });
  }
};