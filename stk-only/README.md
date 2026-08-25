# Fresh M-Pesa STK Push only

This directory is a standalone STK Push backend. It does not include a website, database, payment-status endpoint, or alarm logic.

## Endpoint

`POST /stkpush`

JSON body:

```json
{
  "phone": "2547XXXXXXXX",
  "amount": 10
}
```

The Worker obtains a Daraja OAuth token and sends the STK Push request to Safaricom. Safaricom's Daraja platform is the payment API used here. See the official developer portal: https://developer.safaricom.co.ke/

## Your configuration

Set these as Cloudflare Worker secrets:

- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_URL`

The Worker is configured for the Safaricom sandbox by default. Change `MPESA_BASE_URL` to the production endpoint only when your Daraja application is approved for production.
