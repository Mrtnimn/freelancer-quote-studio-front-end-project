const STORAGE_KEY = 'freelancer-quote-studio-data-v1';

const state = {
  items: [],
  quotes: [],
};

const el = {
  client: document.getElementById('client'),
  email: document.getElementById('email'),
  deadline: document.getElementById('deadline'),
  tax: document.getElementById('tax'),
  notes: document.getElementById('notes'),
  itemName: document.getElementById('item-name'),
  itemQty: document.getElementById('item-qty'),
  itemPrice: document.getElementById('item-price'),
  itemsBody: document.getElementById('items-body'),
  subtotal: document.getElementById('subtotal'),
  taxTotal: document.getElementById('tax-total'),
  grandTotal: document.getElementById('grand-total'),
  feedback: document.getElementById('form-feedback'),
  quotesList: document.getElementById('quotes-list'),
  search: document.getElementById('search'),
  themeToggle: document.getElementById('theme-toggle'),
  importData: document.getElementById('import-data'),
};

function currency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function setFeedback(message, isError = false) {
  el.feedback.textContent = message;
  el.feedback.className = isError ? 'danger' : '';
}

function saveStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.quotes));
}

function loadStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (Array.isArray(parsed)) {
      state.quotes = parsed;
    }
  } catch {
    state.quotes = [];
  }
}

function subtotalValue() {
  return state.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
}

function taxValue() {
  return subtotalValue() * (Math.max(0, Number(el.tax.value) || 0) / 100);
}

function grandTotalValue() {
  return subtotalValue() + taxValue();
}

function renderTotals() {
  el.subtotal.textContent = currency(subtotalValue());
  el.taxTotal.textContent = currency(taxValue());
  el.grandTotal.textContent = currency(grandTotalValue());
}

function removeItem(index) {
  state.items = state.items.filter((_, i) => i !== index);
  renderItems();
}

function renderItems() {
  el.itemsBody.textContent = '';
  state.items.forEach((item, index) => {
    const row = document.createElement('tr');

    const service = document.createElement('td');
    service.textContent = item.name;

    const qty = document.createElement('td');
    qty.textContent = String(item.qty);

    const price = document.createElement('td');
    price.textContent = currency(item.unitPrice);

    const total = document.createElement('td');
    total.textContent = currency(item.qty * item.unitPrice);

    const action = document.createElement('td');
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => removeItem(index));
    action.append(removeButton);

    row.append(service, qty, price, total, action);
    el.itemsBody.append(row);
  });
  renderTotals();
}

function resetQuoteEditor() {
  state.items = [];
  el.client.value = '';
  el.email.value = '';
  el.deadline.value = '';
  el.notes.value = '';
  el.tax.value = '10';
  renderItems();
}

function quoteSummary(quote) {
  return `${quote.client} • ${quote.email} • ${currency(quote.total)} • ${quote.items.length} item${quote.items.length === 1 ? '' : 's'}`;
}

function loadQuote(index) {
  const quote = state.quotes[index];
  if (!quote) {
    return;
  }

  el.client.value = quote.client;
  el.email.value = quote.email;
  el.deadline.value = quote.deadline;
  el.tax.value = String(quote.taxPercent);
  el.notes.value = quote.notes;
  state.items = quote.items.map((item) => ({ ...item }));
  renderItems();
  setFeedback('Quote loaded. You can edit and save as a new quote.');
}

function deleteQuote(index) {
  state.quotes = state.quotes.filter((_, i) => i !== index);
  saveStorage();
  renderQuotes();
}

function filteredQuotes() {
  const query = el.search.value.trim().toLowerCase();
  if (!query) {
    return state.quotes;
  }
  return state.quotes.filter((quote) => {
    return quote.client.toLowerCase().includes(query) || quote.email.toLowerCase().includes(query);
  });
}

function renderQuotes() {
  const view = filteredQuotes();
  el.quotesList.textContent = '';

  if (!view.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No saved quotes yet.';
    el.quotesList.append(empty);
    return;
  }

  view.forEach((quote) => {
    const realIndex = state.quotes.findIndex((q) => q.id === quote.id);

    const item = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = quoteSummary(quote);

    const meta = document.createElement('div');
    meta.className = 'quote-meta';
    meta.textContent = `Updated ${new Date(quote.updatedAt).toLocaleString()}`;

    const actions = document.createElement('div');
    actions.className = 'small-actions';

    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', () => loadQuote(realIndex));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteQuote(realIndex));

    actions.append(loadBtn, deleteBtn);
    item.append(title, meta, actions);
    el.quotesList.append(item);
  });
}

function addItem() {
  const name = el.itemName.value.trim();
  const qty = Number(el.itemQty.value);
  const unitPrice = Number(el.itemPrice.value);

  if (!name || !Number.isFinite(qty) || !Number.isFinite(unitPrice) || qty <= 0 || unitPrice < 0) {
    setFeedback('Add a valid service, quantity, and unit price.', true);
    return;
  }

  state.items.push({ name, qty, unitPrice });
  el.itemName.value = '';
  el.itemQty.value = '1';
  el.itemPrice.value = '0';
  setFeedback('Item added.');
  renderItems();
}

function saveQuote() {
  const client = el.client.value.trim();
  const email = el.email.value.trim();

  if (!client || !email || !el.email.validity.valid || state.items.length === 0) {
    setFeedback('Client, valid email, and at least one item are required.', true);
    return;
  }

  const quote = {
    id: crypto.randomUUID(),
    client,
    email,
    deadline: el.deadline.value,
    taxPercent: Math.max(0, Number(el.tax.value) || 0),
    notes: el.notes.value.trim(),
    items: state.items.map((item) => ({ ...item })),
    subtotal: subtotalValue(),
    total: grandTotalValue(),
    updatedAt: new Date().toISOString(),
  };

  state.quotes.unshift(quote);
  saveStorage();
  renderQuotes();
  setFeedback('Quote saved to local history.');
}

function exportQuotes() {
  const blob = new Blob([JSON.stringify(state.quotes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'freelancer-quotes.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

function importQuotes(file) {
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid import shape');
      }

      const valid = parsed.filter((quote) => {
        return quote && typeof quote.client === 'string' && typeof quote.email === 'string' && Array.isArray(quote.items);
      });

      state.quotes = [...valid, ...state.quotes].slice(0, 100);
      saveStorage();
      renderQuotes();
      setFeedback(`Imported ${valid.length} quote(s).`);
    } catch {
      setFeedback('Could not import file. Please use a valid quote export.', true);
    }
  };
  reader.readAsText(file);
}

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  localStorage.setItem('theme', next);
}

function initializeTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.dataset.theme = saved;
  }
}

function setupEvents() {
  document.getElementById('add-item').addEventListener('click', addItem);
  document.getElementById('save-quote').addEventListener('click', saveQuote);
  document.getElementById('reset-quote').addEventListener('click', () => {
    resetQuoteEditor();
    setFeedback('Quote form reset.');
  });
  document.getElementById('export-data').addEventListener('click', exportQuotes);
  el.importData.addEventListener('change', (event) => {
    importQuotes(event.target.files?.[0]);
    event.target.value = '';
  });
  el.search.addEventListener('input', renderQuotes);
  el.tax.addEventListener('input', renderTotals);
  el.themeToggle.addEventListener('click', toggleTheme);
}

initializeTheme();
loadStorage();
setupEvents();
renderItems();
renderQuotes();
