require('dotenv').config();
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => res.send('Hello from my invoice assistant!'));

app.get('/test-paypal', async (req, res) => {
  try {
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    res.json({ ok: response.ok, token_type: data.token_type, expires_in: data.expires_in, error: data.error });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));