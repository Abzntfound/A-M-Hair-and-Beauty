import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {

    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
    };


    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: "Method Not Allowed"
            })
        };
    }


    try {

        const body = JSON.parse(event.body || "{}");

        const orderNumber = body.orderNumber?.trim();
        const email = body.email?.trim().toLowerCase();


        if (!orderNumber || !email) {

            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: "Missing order number or email"
                })
            };

        }


        const { data, error } = await supabase
            .from("orders")
            .select(`
                order_number,
                customer_name,
                total,
                status,
                courier,
                tracking_number,
                estimated_delivery,
                created_at
            `)
            .eq("order_number", orderNumber)
            .eq("customer_email", email)
            .maybeSingle();


        if (error) {

            console.error("Supabase error:", error);

            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: "Unable to lookup order"
                })
            };

        }


        if (!data) {

            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: "Order not found"
                })
            };

        }


        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };


    } catch (err) {

        console.error("Tracking error:", err);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Server error"
            })
        };

    }

};
