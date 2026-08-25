# M-Pesa Prompt System

This branch contains the standalone M-Pesa STK Push service. The website is intentionally not part of this layer.

## API

### Health
`GET /health`

Returns service status, current mode, and configured prompt amount.

### Send prompt
`POST /api/payment/stk`

Request:
```json
{
  "phone": "0712345678"
}
```

The service normalizes Kenyan numbers to `2547...` or `2541...` and sends the configured STK prompt.

Response includes:
- `checkoutRequestId`
- `merchantRequestId`
- `customerMessage`

### Check payment
`GET /api/payment/status?checkoutRequestId=...`

The service queries M-Pesa for the current result and returns `paid`, `pending`, `resultCode`, and `resultDescription`.

### Callback
`POST /api/payment/callback`

Safaricom can post the STK callback here. The service acknowledges the callback. Payment verification remains server-side through the status query, so the website never needs M-Pesa credentials.

## Server configuration

Non-secret settings are in `wrangler.jsonc`:

- `MPESA_SHORTCODE`
- `MPESA_TRANSACTION_TYPE`
- `MPESA_BASE_URL`
- `MPESA_AMOUNT`
- `MPESA_ACCOUNT_REFERENCE`
- `MPESA_TRANSACTION_DESC`

Secrets must be configured server-side:

- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_URL`

The current configuration is set to Safaricom sandbox. Daraja is the Safaricom platform used to connect applications to M-Pesa APIs. citeturn667630search0
