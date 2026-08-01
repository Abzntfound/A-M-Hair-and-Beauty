import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: "Method Not Allowed"
        };
    }

    try {

        const { orderNumber, email } = JSON.parse(event.body);

        if (!orderNumber || !email) {
            return {
                statusCode: 400,
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
                customer_email,
                total,
                status,
                courier,
                tracking_number,
                estimated_delivery,
                created_at
            `)
            .eq("order_number", orderNumber)
            .eq("customer_email", email)
            .single();

        if (error || !data) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    error: "Order not found"
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (err) {

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: err.message
            })
        };

    }

};
