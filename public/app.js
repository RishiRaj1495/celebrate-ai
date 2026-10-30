const form = document.getElementById('plan-form');
const results = document.getElementById('results');
const statusEl = document.getElementById('status');
const errorsEl = document.getElementById('errors');
const submit = document.getElementById('submit');
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

// Default the date picker to tomorrow and forbid past dates.
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
form.eventDate.min = tomorrow;
form.eventDate.value = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);

/** Tiny DOM helper: all text goes through textContent, never innerHTML. */
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => (k === 'class' ? (node.className = v) : node.setAttribute(k, v)));
  children.flat().forEach((c) => node.append(c));
  return node;
}

const list = (items) => el('ul', {}, items.map((i) => el('li', {}, i)));

function table(caption, headers, rows) {
  return el('table', {},
    el('caption', { class: 'hint' }, caption),
    el('thead', {}, el('tr', {}, headers.map((h) => el('th', { scope: 'col' }, h)))),
    el('tbody', {}, rows.map((r) => el('tr', {}, r.map((cell, i) => el('td', i === r.length - 1 && cell.num ? { class: 'num' } : {}, cell.text ?? cell))))),
  );
}

function render({ plan, ideas, aiPowered }) {
  const nodes = [
    el('h2', {}, `Your ${plan.eventType} plan`),
    el('p', {}, `${plan.guests} guests · ${inr.format(plan.budget.total)} total · about ${inr.format(plan.budget.perGuest)} per guest `,
      el('span', { class: 'badge' }, aiPowered ? 'Ideas by Gemini' : 'Ideas unavailable: showing core plan')),
    el('h2', {}, 'Budget'),
    table('Budget breakdown', ['Category', 'Share', 'Amount'],
      plan.budget.breakdown.map((r) => [r.category, `${Math.round(r.share * 100)}%`, { text: inr.format(r.amount), num: true }])),
    el('h2', {}, 'Timeline'),
    table('Planning timeline', ['Date', 'Task'], plan.timeline.map((t) => [t.date, t.task])),
    el('h2', {}, 'Vendor checklist'),
    ...plan.vendorChecklist.map((v) => el('div', { class: 'card' }, el('h3', {}, v.vendor), el('ul', { class: 'checklist' }, v.items.map((i, n) => {
      const id = `chk-${v.vendor.replace(/\W+/g, '')}-${n}`;
      return el('li', {}, el('input', { type: 'checkbox', id }), ' ', el('label', { for: id }, i));
    })))),
  ];
  if (ideas) {
    nodes.push(el('h2', {}, 'Personalised ideas'),
      el('div', { class: 'card' }, el('h3', {}, 'Themes'), list(ideas.themes), el('h3', {}, 'Menu'), list(ideas.menu),
        el('h3', {}, 'Activities'), list(ideas.activities), el('h3', {}, 'Tips'), list(ideas.tips)));
  }
  nodes.push(el('p', {}, el('button', { type: 'button', id: 'print' }, 'Print or save as PDF')));
  results.replaceChildren(...nodes);
  results.hidden = false;
  results.focus();
  document.getElementById('print').addEventListener('click', () => window.print());
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorsEl.replaceChildren();
  const data = Object.fromEntries(new FormData(form));
  data.budget = Number(data.budget);
  data.guests = Number(data.guests);
  submit.disabled = true;
  statusEl.textContent = 'Planning your event…';
  try {
    const res = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const body = await res.json();
    if (!res.ok) {
      const msgs = body.errors || [body.error || 'Something went wrong'];
      errorsEl.replaceChildren(el('ul', {}, msgs.map((m) => el('li', {}, m))));
      statusEl.textContent = '';
      return;
    }
    render(body);
    statusEl.textContent = 'Plan ready.';
  } catch {
    errorsEl.textContent = 'Network error. Please try again.';
    statusEl.textContent = '';
  } finally {
    submit.disabled = false;
  }
});
