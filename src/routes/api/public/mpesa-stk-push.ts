// src/routes/api/public/mpesa-stk-push.ts
import { createFileRoute } from "@tanstack/react-router";
import { savePayment, sendStkPush } from "@/lib/mpesa.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export const Route = createFileRoute("/api/public/mpesa-stk-push")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        let body: { phone?: string; amount?: number; orderRef?: string };
        try {
          body = await request.json();
        } catch {
          return json({ success: false, error: "Invalid JSON body" }, 400);
        }

        const { phone, amount, orderRef } = body;
        if (!phone || !amount || !orderRef) {
          return json(
            { success: false, error: "phone, amount and orderRef are required" },
            400,
          );
        }

        try {
          const callbackUrl = `${new URL(request.url).origin}/api/public/mpesa-callback`;
          const { checkoutRequestId, merchantRequestId } = await sendStkPush({
            phone,
            amount,
            orderRef,
            callbackUrl,
          });

          await savePayment(orderRef, {
            status: "pending",
            checkoutRequestId,
            merchantRequestId,
            phone,
            amount,
            updatedAt: new Date().toISOString(),
          });

          return json({ success: true, checkoutRequestId, orderRef });
        } catch (err) {
          console.error("STK push error:", err);
          const message = err instanceof Error ? err.message : "Failed to initiate payment";
          return json({ success: false, error: message }, 502);
        }
      },
    },
  },
});
