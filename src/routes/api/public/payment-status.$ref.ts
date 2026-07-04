// src/routes/api/public/payment-status.$ref.ts
// The frontend polls this endpoint to learn the STK push outcome.
import { createFileRoute } from "@tanstack/react-router";
import { getPayment } from "@/lib/mpesa.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/payment-status/$ref")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      GET: async ({ params }) => {
        const record = await getPayment(params.ref);
        const body = record
          ? {
              status: record.status,
              resultCode: record.resultCode ?? null,
              resultDesc: record.resultDesc ?? null,
              mpesaReceipt: record.mpesaReceipt ?? null,
            }
          : { status: "unknown" };

        return new Response(JSON.stringify(body), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      },
    },
  },
});
