const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });

const apiBase = (env) => env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";
const amount = (env) => Number(env.MPESA_AMOUNT || 10);

const timestamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const base64 = (value) => btoa(value);

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (/^07\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^01\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254\d{9}$/.test(digits)) return digits;
  return null;
}

async function getAccessToken(env) {
  if (!env.MPESA_CONSUMER_KEY || !env.MPESA_CONSUMER_SECRET) {
    throw new Error("M-Pesa credentials are not configured on the server.");
  }

  const credentials = base64(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`);
  const response = await fetch(`${apiBase(env)}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.errorMessage || data.error_description || "Unable to authenticate with M-Pesa.");
  }

  return data.access_token;
}

function stkPassword(env, timestampValue) {
  if (!env.MPESA_SHORTCODE || !env.MPESA_PASSKEY) {
    throw new Error("M-Pesa shortcode or passkey is not configured on the server.");
  }
  return base64(`${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestampValue}`);
}

async function stkPush(env, phone) {
  const token = await getAccessToken(env);
  const ts = timestamp();
  const value = amount(env);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error("MPESA_AMOUNT must be a positive whole number.");
  }

  const payload = {
    BusinessShortCode: env.MPESA_SHORTCODE,
    Password: stkPassword(env, ts),
    Timestamp: ts,
    TransactionType: env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline",
    Amount: value,
    PartyA: phone,
    PartyB: env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: env.MPESA_CALLBACK_URL,
    AccountReference: env.MPESA_ACCOUNT_REFERENCE || "BINJO",
    TransactionDesc: env.MPESA_TRANSACTION_DESC || `BINJO M-Pesa payment KSh ${value}`,
  };

  const response = await fetch(`${apiBase(env)}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || data.ResponseCode !== "0") {
    throw new Error(data.errorMessage || data.ResponseDescription || "STK Push failed.");
  }

  return data;
}

async function stkQuery(env, checkoutRequestId) {
  const token = await getAccessToken(env);
  const ts = timestamp();

  const response = await fetch(`${apiBase(env)}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: env.MPESA_SHORTCODE,
      Password: stkPassword(env, ts),
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.errorMessage || data.ResponseDescription || "Payment status query failed.");
  }

  return data;
}

function acceptedCallback() {
  return json({ ResultCode: 0, ResultDesc: "Accepted" });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/health" && request.method === "GET") {
        return json({
          ok: true,
          service: "binjo-mpesa-prompt",
          mode: env.MPESA_BASE_URL?.includes("sandbox") ? "sandbox" : "production",
          amount: amount(env),
        });
      }

      if (url.pathname === "/api/payment/stk" && request.method === "POST") {
        const body = await request.json().catch(() => null);
        const phone = normalizePhone(body?.phone);

        if (!phone) {
          return json({ ok: false, error: "Enter a valid Kenyan M-Pesa number." }, 400);
        }

        const result = await stkPush(env, phone);

        return json({
          ok: true,
          merchantRequestId: result.MerchantRequestID,
          checkoutRequestId: result.CheckoutRequestID,
          responseCode: result.ResponseCode,
          customerMessage: result.CustomerMessage || "Check your phone and enter your M-Pesa PIN.",
        });
      }

      if (url.pathname === "/api/payment/status" && request.method === "GET") {
        const checkoutRequestId = url.searchParams.get("checkoutRequestId");

        if (!checkoutRequestId) {
          return json({ ok: false, error: "Missing checkoutRequestId." }, 400);
        }

        const result = await stkQuery(env, checkoutRequestId);
        const code = String(result.ResultCode ?? "");

        return json({
          ok: true,
          paid: code === "0",
          pending: code === "1037" || code === "1",
          resultCode: result.ResultCode ?? null,
          resultDescription: result.ResultDesc || null,
          checkoutRequestId,
        });
      }

      if ((url.pathname === "/api/payment/callback" || url.pathname === "/callback") && request.method === "POST") {
        await request.text();
        return acceptedCallback();
      }

      return json({ ok: false, error: "Not found." }, 404);
    } catch (error) {
      return json({
        ok: false,
        error: error instanceof Error ? error.message : "Payment service error.",
      }, 500);
    }
  },
};
