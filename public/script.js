// ---------- Invoice list ----------
const invoiceBody = document.getElementById('invoice-body');
const listMessage = document.getElementById('list-message');
const refreshBtn = document.getElementById('refresh-btn');

function formatDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d)) return isoDate;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function loadInvoices() {
  refreshBtn.disabled = true;
  listMessage.className = 'message';
  listMessage.textContent = 'Loading invoices...';
  invoiceBody.innerHTML = '';

  try {
    const res = await fetch('/api/invoices');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Could not load invoices.');

    const items = data.items || [];
    if (items.length === 0) {
      listMessage.textContent = 'No invoices yet.';
      return;
    }
    listMessage.textContent = '';

    items.forEach((inv) => {
      const billing = inv.primary_recipients?.[0]?.billing_info;
      const client =
        billing?.business_name ||
        billing?.name?.full_name ||
        `${billing?.name?.given_name || ''} ${billing?.name?.surname || ''}`.trim() ||
        '—';
      const amount = inv.amount ? `${inv.amount.value} ${inv.amount.currency_code}` : '—';
      const number = inv.detail?.invoice_number ? `#${inv.detail.invoice_number}` : inv.id;
      const due = formatDate(inv.detail?.payment_term?.due_date);

      const row = document.createElement('tr');
      [number, client, amount, due].forEach((text) => {
        const td = document.createElement('td');
        td.textContent = text; // textContent keeps user-typed text safe
        row.appendChild(td);
      });

      const statusTd = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'badge ' + (inv.status || '').toLowerCase();
      badge.textContent = inv.status || 'UNKNOWN';
      statusTd.appendChild(badge);
      row.appendChild(statusTd);

      invoiceBody.appendChild(row);
    });
  } catch (err) {
    listMessage.className = 'message error';
    listMessage.textContent = err.message;
  } finally {
    refreshBtn.disabled = false;
  }
}

// ---------- Invoice form ----------
const form = document.getElementById('invoice-form');
const itemsBox = document.getElementById('items');
const formMessage = document.getElementById('form-message');
const createBtn = document.getElementById('create-btn');
const totalLine = document.getElementById('total-line');

function updateTotal() {
  let total = 0;
  document.querySelectorAll('.item-row').forEach((row) => {
    total += Number(row.querySelector('.item-qty').value) * Number(row.querySelector('.item-price').value) || 0;
  });
  totalLine.innerHTML = `<strong>Total: $${total.toFixed(2)}</strong>`;
}

function addItemRow(name = '', quantity = 1, price = '') {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input class="item-name" placeholder="Item (e.g. Logo design)" />
    <input class="item-qty" type="number" min="0" step="any" placeholder="Qty" />
    <input class="item-price" type="number" min="0" step="any" placeholder="Price each" />
    <button type="button" class="remove-btn">✕</button>`;
  row.querySelector('.item-name').value = name;
  row.querySelector('.item-qty').value = quantity;
  row.querySelector('.item-price').value = price;
  row.addEventListener('input', updateTotal);
  row.querySelector('.remove-btn').addEventListener('click', () => {
    row.remove();
    updateTotal();
  });
  itemsBox.appendChild(row);
  updateTotal();
}

function getFormData() {
  return {
    clientName: document.getElementById('client-name').value,
    clientEmail: document.getElementById('client-email').value,
    terms: document.getElementById('terms').value,
    items: [...document.querySelectorAll('.item-row')].map((row) => ({
      name: row.querySelector('.item-name').value,
      quantity: row.querySelector('.item-qty').value,
      price: row.querySelector('.item-price').value,
    })),
  };
}

// Fills the form (used by the AI step)
function setFormData(data) {
  document.getElementById('client-name').value = data.clientName || '';
  document.getElementById('client-email').value = data.clientEmail || '';
  document.getElementById('terms').value = data.terms || 'NET_15';
  itemsBox.innerHTML = '';
  (data.items || []).forEach((i) => addItemRow(i.name, i.quantity, i.price));
  if (!itemsBox.children.length) addItemRow();
  updateTotal();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  createBtn.disabled = true;
  formMessage.className = 'message';
  formMessage.textContent = 'Creating invoice...';
  try {
    const res = await fetch('/api/create-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getFormData()),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Something went wrong.');
    formMessage.className = 'message success';
    formMessage.textContent = `Invoice ${data.id} created as a draft. Total: $${data.total}`;
    loadInvoices();
  } catch (err) {
    formMessage.className = 'message error';
    formMessage.textContent = err.message;
  } finally {
    createBtn.disabled = false;
  }
});

// ---------- AI step ----------
const aiText = document.getElementById('ai-text');
const aiBtn = document.getElementById('ai-btn');
const aiMessage = document.getElementById('ai-message');

aiBtn.addEventListener('click', async () => {
  aiBtn.disabled = true;
  aiBtn.textContent = 'Reading...';
  aiMessage.className = 'message';
  aiMessage.textContent = 'Reading your description...';
  try {
    const res = await fetch('/api/parse-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: aiText.value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'The AI could not read that.');
    setFormData(data);
    formMessage.textContent = '';
    aiMessage.className = 'message success';
    aiMessage.textContent = 'Done. Check the details below, fix anything wrong, then click Create invoice.';
    form.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    aiMessage.className = 'message error';
    aiMessage.textContent = err.message;
  } finally {
    aiBtn.disabled = false;
    aiBtn.textContent = 'Generate invoice';
  }
});

// ---------- Start up ----------
refreshBtn.addEventListener('click', loadInvoices);
document.getElementById('add-item-btn').addEventListener('click', () => addItemRow());
addItemRow();
loadInvoices();