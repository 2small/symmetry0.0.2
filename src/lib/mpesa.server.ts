// src/lib/mpesa.server.ts
// Server-only M-Pesa / Daraja helpers. The `.server.ts` suffix keeps this file
// out of the client bundle. Never import it from a component.

// --- Persistent payment status store -----------------------------------------
// Production (Cloudflare Workers) uses the `PAYMENTS` KV namespace so the STK
// push handler and the async Safaricom callback — which run in different
// invocations — can share state. In the local preview KV is not bound, so we
// fall back to an in-memory map (single isolate, good enough for dev testing).

const memStore = new Map<string, string>();

type KVLike = {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
};

async function getKV(): Promise<KVLike | null> {
  try {
    // `cloudflare:workers` only resolves in the Worker runtime; ignore in dev.
    const mod = await import(/* @vite-ignore */ "cloudflare:workers" as string);
    const env = (mod as { env?: Record<string, unknown> }).env;
    const kv = env?.PAYMENTS as KVLike | undefined;
    return kv ?? null;
  } catch {
    return null;
  }
}

async function storeGet(key: string): Promise<string | null> {
  const kv = await getKV();
  if (kv) return kv.get(key);
  return memStore.get(key) ?? null;
}

async function storePut(key: string, value: string): Promise<void> {
  const kv = await getKV();
  if (kv) {
    await kv.put(key, value, { expirationTtl: 60 * 60 * 24 });
    return;
  }
  memStore.set(key, value);
}

export type PaymentRecord = {
  status: "pending" | "completed" | "failed";
  checkoutRequestId: string;
  merchantRequestId?: string;
  phone?: string;
  amount?: number;
  resultCode?: string;
  resultDesc?: string;
  mpesaReceipt?: string;
  updatedAt: string;
};

export async function savePayment(orderRef: string, record: PaymentRecord): Promise<void> {
  await storePut(`payment:${orderRef}`, JSON.stringify(record));
  // Reverse index so the callback (which only knows the CheckoutRequestID) can
  // resolve the original order reference.
  await storePut(`checkout:${record.checkoutRequestId}`, orderRef);
}

export async function getPayment(orderRef: string): Promise<PaymentRecord | null> {
  const raw = await storeGet(`payment:${orderRef}`);
  return raw ? (JSON.parse(raw) as PaymentRecord) : null;
}

export async function getOrderRefByCheckout(checkoutRequestId: string): Promise<string | null> {
  return storeGet(`checkout:${checkoutRequestId}`);
}

// --- Daraja API config -------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

// Sandbox by default; set MPESA_ENV=production to hit the live endpoints.
function darajaBase(): string {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getDarajaToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.token;

  const auth = btoa(
    `${requireEnv("MPESA_CONSUMER_KEY")}:${requireEnv("MPESA_CONSUMER_SECRET")}`,
  );
  const res = await fetch(
    `${darajaBase()}/oauth/v1/generate?grant_type=client_credentials`,
    { method: "GET", headers: { Authorization: `Basic ${auth}` } },
  );
  if (!res.ok) {
    throw new Error(`Daraja token request failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: string };
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (parseInt(data.expires_in, 10) - 60) * 1000,
  };
  return data.access_token;
}

export function darajaTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

export function normalizePhone(raw: string): string {
  let phone = raw.trim().replace(/\s+/g, "");
  if (phone.startsWith("+")) phone = phone.slice(1);
  if (phone.startsWith("0")) phone = "254" + phone.slice(1);
  if (phone.startsWith("7") || phone.startsWith("1")) phone = "254" + phone;
  return phone;
}

export type StkPushResult = {
  checkoutRequestId: string;
  merchantRequestId: string;
};

export async function sendStkPush(params: {
  phone: string;
  amount: number;
  orderRef: string;
  callbackUrl: string;
}): Promise<StkPushResult> {
  const shortcode = requireEnv("MPESA_SHORTCODE");
  const passkey = requireEnv("MPESA_PASSKEY");
  const timestamp = darajaTimestamp();
  const password = btoa(shortcode + passkey + timestamp);
  const phone = normalizePhone(params.phone);
  const token = await getDarajaToken();

  const res = await fetch(`${darajaBase()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(params.amount),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: params.callbackUrl,
      AccountReference: params.orderRef.slice(0, 12),
      TransactionDesc: `Payment ${params.orderRef}`.slice(0, 13),
    }),
  });

  const data = (await res.json()) as {
    ResponseCode?: string;
    ResponseDescription?: string;
    errorMessage?: string;
    CheckoutRequestID?: string;
    MerchantRequestID?: string;
  };

  if (data.ResponseCode !== "0" || !data.CheckoutRequestID) {
    throw new Error(
      data.ResponseDescription || data.errorMessage || "STK push rejected by Daraja",
    );
  }

  return {
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID ?? "",
  };
}
