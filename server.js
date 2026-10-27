require('dotenv').config();
const express = require('express');
const app = express();
const PORT = 3000;
const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com';

app.use(express.json());

// Asks PayPal for a temporary access token (the "key card")
async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await response.json();
  if (!response.ok) throw new Error('Token request failed: ' + (data.error || response.status));
  return data.access_token;
}

app.get('/', (req, res) => res.send('Hello from PayVoice Assistant!'));

// Handshake test (what you already ran)
app.get('/test-payvoice', async (req, res) => {
  try {
    await getAccessToken();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Creates a DRAFT invoice with hardcoded test data
app.get('/test-invoice', async (req, res) => {
  try {
    const token = await getAccessToken();

    const invoice = {
      detail: {
        currency_code: 'USD',
        payment_term: { term_type: 'NET_14' },
      },
      primary_recipients: [
        {
          billing_info: {
            name: { given_name: 'Test', surname: 'Client' },
            email_address: 'customer@example.com',
          },
        },
      ],
      items: [
        {
          name: 'Logo design',
          quantity: '3',
          unit_amount: { currency_code: 'USD', value: '150.00' },
        },
      ],
    };

    const response = await fetch(`${PAYPAL_BASE}/v2/invoicing/invoices`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoice),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Lists your invoices (this will power your dashboard later)
app.get('/api/invoices', async (req, res) => {
  try {
    const token = await getAccessToken();
    const response = await fetch(
      `${PAYPAL_BASE}/v2/invoicing/invoices?page=1&page_size=20&total_required=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));

