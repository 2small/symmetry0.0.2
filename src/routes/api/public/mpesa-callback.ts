// src/routes/api/public/mpesa-callback.ts
// Safaricom Daraja calls this URL asynchronously with the STK push result.
import { createFileRoute } from "@tanstack/react-router";
import { getOrderRefByCheckout, getPayment, savePayment } from "@/lib/mpesa.server";

type CallbackItem = { Name: string; Value?: string | number };

export const Route = createFileRoute("/api/public/mpesa-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: {
          Body?: {
            stkCallback?: {
              MerchantRequestID?: string;
              CheckoutRequestID?: string;
              ResultCode?: number;
              ResultDesc?: string;
              CallbackMetadata?: { Item?: CallbackItem[] };
            };
          };
        };
        try {
          payload = await request.json();
        } catch {
          // Always ack Safaricom so it stops retrying.
          return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
        }

        const cb = payload?.Body?.stkCallback;
        const checkoutRequestId = cb?.CheckoutRequestID;

        if (checkoutRequestId) {
          const orderRef = await getOrderRefByCheckout(checkoutRequestId);
          if (orderRef) {
            const existing = await getPayment(orderRef);
            const resultCode = cb?.ResultCode;
            const items = cb?.CallbackMetadata?.Item ?? [];
            const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;

            await savePayment(orderRef, {
              status: resultCode === 0 ? "completed" : "failed",
              checkoutRequestId,
              merchantRequestId: cb?.MerchantRequestID ?? existing?.merchantRequestId,
              phone: existing?.phone,
              amount: existing?.amount,
              resultCode: resultCode != null ? String(resultCode) : undefined,
              resultDesc: cb?.ResultDesc,
              mpesaReceipt: receipt != null ? String(receipt) : undefined,
              updatedAt: new Date().toISOString(),
            });
          }
        }

        return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
      },
    },
  },
});
