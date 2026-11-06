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

const VALID_TERMS = ['DUE_ON_RECEIPT', 'NET_10', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90'];
const MAX_TOTAL = 10000; // safety limit: refuse crazy amounts

// Checks and cleans whatever the browser (or, later, the AI) sends us
function cleanInvoiceInput(body) {
  const clientName = String(body.clientName || '').trim();
  const clientEmail = String(body.clientEmail || '').trim();
  const terms = VALID_TERMS.includes(body.terms) ? body.terms : 'NET_15';

  if (!clientName) throw new Error('Client name is required.');
  if (!Array.isArray(body.items) || body.items.length === 0) throw new Error('Add at least one item.');

  const items = body.items.map((i) => ({
    name: String(i.name || '').trim(),
    quantity: Number(i.quantity),
    price: Number(i.price),
  }));

  for (const item of items) {
    if (!item.name) throw new Error('Every item needs a name.');
    if (!(item.quantity > 0) || !(item.price > 0)) {
      throw new Error(`"${item.name}" needs a quantity and a price above 0.`);
    }
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
  if (total > MAX_TOTAL) {
    throw new Error(`Total ${total.toFixed(2)} is above the ${MAX_TOTAL} USD safety limit.`);
  }

  return { clientName, clientEmail, currency: 'USD', terms, items, total };
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

// Creates a DRAFT invoice from the form data
app.post('/api/create-invoice', async (req, res) => {
  let input;
  try {
    input = cleanInvoiceInput(req.body);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }

  try {
    const token = await getAccessToken();

    const billing_info = { business_name: input.clientName };
    if (input.clientEmail) billing_info.email_address = input.clientEmail;

    const invoice = {
      detail: {
        currency_code: input.currency,
        payment_term: { term_type: input.terms },
      },
      primary_recipients: [{ billing_info }],
      items: input.items.map((i) => ({
        name: i.name,
        quantity: String(i.quantity),
        unit_amount: { currency_code: input.currency, value: i.price.toFixed(2) },
      })),
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
    if (!response.ok) {
      console.log('PayPal error:', JSON.stringify(data)); // shows in the terminal
      return res.status(response.status).json({
        message: data.details?.[0]?.description || data.message || 'PayPal rejected the invoice.',
      });
    }

    res.json({ ok: true, id: data.href.split('/').pop(), total: input.total.toFixed(2) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));