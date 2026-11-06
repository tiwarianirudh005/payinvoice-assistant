require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com';

app.use(express.json());
app.use(express.static('public')); // serves your website from the public folder

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

// Lists your invoices (powers the dashboard)
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
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));