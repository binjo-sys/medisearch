const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST,OPTIONS",
    },
  });

const apiBase = (env) => env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (/^07\d{8}$/.test(digits) || /^01\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254\d{9}$/.test(digits)) return digits;
  return null;
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function base64(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

async function getAccessToken(env) {
  if (!env.MPESA_CONSUMER_KEY || !env.MPESA_CONSUMER_SECRET) {
    throw new Error("M-Pesa credentials are not configured.");
  }

  const credentials = base64(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`);
  const response = await fetch(
    `${apiBase(env)}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } },
  );

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.errorMessage || "Unable to obtain M-Pesa access token.");
  }

  return data.access_token;
}

async function sendStkPush(env, phone, amount) {
  if (!env.MPESA_SHORTCODE || !env.MPESA_PASSKEY || !env.MPESA_CALLBACK_URL) {
    throw new Error("M-Pesa shortcode, passkey, and callback URL must be configured.");
  }

  const token = await getAccessToken(env);
  const ts = timestamp();
  const password = base64(`${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${ts}`);

  const payload = {
    BusinessShortCode: env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: ts,
    TransactionType: env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: env.MPESA_CALLBACK_URL,
    AccountReference: env.MPESA_ACCOUNT_REFERENCE || "STK-PUSH",
    TransactionDesc: env.MPESA_TRANSACTION_DESC || "M-Pesa STK payment",
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
  if (!response.ok || String(data.ResponseCode) !== "0") {
    throw new Error(
      data.errorMessage || data.ResponseDescription || "STK Push request failed.",
    );
  }

  return data;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "content-type",
          "access-control-allow-methods": "POST,OPTIONS",
        },
      });
    }

    const url = new URL(request.url);

    if (url.pathname !== "/stkpush" || request.method !== "POST") {
      return json({ ok: false, error: "Use POST /stkpush" }, 404);
    }

    try {
      const body = await request.json();
      const phone = normalizePhone(body.phone);
      const amount = Number(body.amount);

      if (!phone) return json({ ok: false, error: "Enter a valid Kenyan M-Pesa number." }, 400);
      if (!Number.isInteger(amount) || amount <= 0) {
        return json({ ok: false, error: "Amount must be a positive whole number." }, 400);
      }

      const result = await sendStkPush(env, phone, amount);

      return json({
        ok: true,
        merchantRequestId: result.MerchantRequestID,
        checkoutRequestId: result.CheckoutRequestID,
        responseCode: result.ResponseCode,
        customerMessage: result.CustomerMessage || "Check your phone for the M-Pesa payment prompt.",
      });
    } catch (error) {
      return json({
        ok: false,
        error: error instanceof Error ? error.message : "STK Push error.",
      }, 500);
    }
  },
};
