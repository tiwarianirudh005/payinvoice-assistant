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

refreshBtn.addEventListener('click', loadInvoices);
loadInvoices();