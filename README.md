# PayVoice Assistant

Turn plain English into PayPal invoices. Describe a job, let AI draft the invoice, review it, and create it in PayPal.

**Live demo:** https://payinvoice-assistant.onrender.com/ (the free host sleeps when idle, so the first load can take about a minute)
**Demo video:** YOUR_YOUTUBE_URL

## The problem
Freelancers and small businesses lose time filling in invoice forms and often get them wrong. PayVoice lets them just describe the job ("Three logos for Acme Corp at 150 dollars each, due in 14 days") and handles the rest.

## How it works
1. Describe the job in plain English.
2. The AI reads it and fills in an invoice form (client, items, quantities, prices, payment terms).
3. You review and edit the form. **Nothing is created until you approve it.**
4. The server creates a draft invoice through the PayPal Invoicing API.
5. The dashboard lists your invoices with their status.

## How PayPal is used
- PayPal **Invoicing API v2** (sandbox): creates draft invoices and lists invoices.
- **OAuth 2.0** client credentials flow to get access tokens.
- Uses the free **PayPal sandbox**, so no real money is involved.

## How AI is used
- **Google Gemini (Flash-Lite model)** via the Gemini API, set with the `AI_MODEL` variable.
- The AI turns the free-text description into structured JSON (client, email, items, quantity, unit price, payment terms).
- The AI never creates an invoice by itself. A human reviews and approves every invoice.
- Output is validated again on the server before anything is sent to PayPal.

## Safety features
- Human approval step before any invoice is created
- Server-side validation of every field (names, quantities, prices above zero)
- $10,000 total safety limit per invoice
- API keys stay on the server, never in the browser
- Description length limit to prevent abuse

## Tech stack
Node.js, Express, vanilla HTML/CSS/JavaScript, PayPal Invoicing API (sandbox), Google Gemini API, Render.

## Run it yourself
Requires Node.js 18 or newer, a free [PayPal Developer](https://developer.paypal.com) account with a sandbox app (Invoicing enabled), and a Gemini API key.

```
git clone https://github.com/tiwarianirudh005/payinvoice-assistant.git
cd payinvoice-assistant
npm install
```
Copy `.env.example` to `.env` and fill in your four values, then:
```
node server.js
```
Open http://localhost:3000.

## Try these examples
- Three logos for Acme Corp at 150 dollars each, due in 14 days
- Website redesign for Bright Dental, 1200 flat, due on receipt, email accounts@brightdental.com
- Two hours of consulting at 80 an hour and one report for 200 for Nova Labs, net 30

## Built during the hackathon
This project was created during the PayPal AI Hackathon submission period.

## What's next
Send invoices to clients, payment tracking, voice input, and more currencies.

## License
MIT
