/**
 * Deterministic planning engine.
 * Budget maths, timelines and vendor checklists are computed here (not by the LLM)
 * so totals always add up and the app still works without an API key.
 */

export const EVENT_TYPES = ['wedding', 'birthday', 'community'];

/** Budget share per category; each set sums to exactly 1. Last entry is always contingency. */
const BUDGET_WEIGHTS = {
  wedding: [
    ['Venue', 0.3], ['Catering', 0.3], ['Decor & flowers', 0.1], ['Photo & video', 0.1],
    ['Attire & styling', 0.08], ['Music & entertainment', 0.05], ['Invitations & stationery', 0.02],
    ['Contingency', 0.05],
  ],
  birthday: [
    ['Venue', 0.2], ['Food & cake', 0.38], ['Decor', 0.15], ['Entertainment', 0.15],
    ['Photography', 0.04], ['Invitations & return gifts', 0.03], ['Contingency', 0.05],
  ],
  community: [
    ['Venue & permits', 0.2], ['Food & refreshments', 0.25], ['Sound & AV', 0.15], ['Decor & signage', 0.08],
    ['Publicity', 0.12], ['Volunteers & safety', 0.1], ['Entertainment', 0.05], ['Contingency', 0.05],
  ],
};

/** [daysBefore, task] — scaled down when the event is closer than the ideal lead time. */
const TIMELINES = {
  wedding: {
    leadDays: 270,
    steps: [
      [270, 'Fix budget, guest list size and preferred dates'], [240, 'Book venue and photographer'],
      [180, 'Book caterer, decorator and music'], [120, 'Send save-the-dates; shop for attire'],
      [60, 'Send formal invitations; finalise menu'], [30, 'Confirm all vendors in writing; plan seating'],
      [14, 'Collect RSVPs; final headcount to caterer'], [7, 'Run-through with vendors and family'],
      [1, 'Pack emergency kit; confirm transport'], [0, 'Event day'],
    ],
  },
  birthday: {
    leadDays: 45,
    steps: [
      [45, 'Set budget, theme and guest list'], [35, 'Book venue and entertainer'],
      [28, 'Order cake; shortlist caterer'], [21, 'Send invitations'], [10, 'Confirm RSVPs and vendors'],
      [3, 'Buy decor and return gifts'], [1, 'Set up venue; confirm cake pickup'], [0, 'Event day'],
    ],
  },
  community: {
    leadDays: 90,
    steps: [
      [90, 'Define goals, budget and organising committee'], [75, 'Apply for permits; book venue'],
      [60, 'Recruit volunteers; line up sponsors'], [45, 'Book sound, AV and caterer'],
      [30, 'Launch publicity (posters, WhatsApp, social media)'], [14, 'Safety and first-aid plan; volunteer briefing'],
      [7, 'Final vendor confirmations; print signage'], [1, 'Venue setup and sound check'], [0, 'Event day'],
      [-3, 'Thank-you notes, expense reconciliation, feedback form'],
    ],
  },
};

const VENDORS = {
  wedding: [
    ['Venue', ['Capacity and date confirmed', 'Overtime and cancellation terms', 'Power backup and parking']],
    ['Caterer', ['Tasting done', 'Per-plate price and tax', 'Dietary options', 'Staff count']],
    ['Photographer / videographer', ['Portfolio reviewed', 'Delivery timeline', 'Raw-file and album terms']],
    ['Decorator / florist', ['Mood board approved', 'Setup and teardown timings']],
    ['Music / DJ', ['Playlist and do-not-play list', 'Sound equipment included']],
  ],
  birthday: [
    ['Venue', ['Capacity and timing', 'Outside food and cake allowed?']],
    ['Cake & food', ['Allergen check', 'Pickup or delivery time']],
    ['Entertainer / games', ['Age-appropriate acts', 'Duration and price']],
    ['Decor', ['Theme items ordered', 'Balloons and backdrop setup time']],
  ],
  community: [
    ['Venue / permits', ['Written permission', 'Capacity and fire-safety limits']],
    ['Sound & AV', ['Mics, speakers, projector', 'Noise curfew compliance']],
    ['Caterer / refreshments', ['Quantities per headcount', 'Clean water and waste bins']],
    ['Volunteers & safety', ['Roles assigned', 'First-aid kit', 'Emergency contacts']],
    ['Publicity', ['Poster and social copy', 'Registration link or form']],
  ],
};

/** Split `total` across weights using the largest-remainder method so the parts sum exactly. */
export function allocateBudget(type, total) {
  const weights = BUDGET_WEIGHTS[type];
  const raw = weights.map(([name, w]) => ({ name, share: w, exact: total * w }));
  const rows = raw.map((r) => ({ category: r.name, share: r.share, amount: Math.floor(r.exact), frac: r.exact - Math.floor(r.exact) }));
  let leftover = total - rows.reduce((s, r) => s + r.amount, 0);
  [...rows].sort((a, b) => b.frac - a.frac).forEach((r) => {
    if (leftover > 0) { r.amount += 1; leftover -= 1; }
  });
  return rows.map(({ category, share, amount }) => ({ category, share, amount }));
}

const MS_PER_DAY = 86_400_000;
const toISO = (d) => d.toISOString().slice(0, 10);

/** Build dated milestones; compresses the schedule if the event is nearer than the ideal lead time. */
export function buildTimeline(type, eventDate, today = new Date()) {
  const { leadDays, steps } = TIMELINES[type];
  const event = new Date(`${eventDate}T00:00:00Z`);
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const daysAvailable = Math.max(0, Math.round((event - start) / MS_PER_DAY));
  const scale = Math.min(1, daysAvailable / leadDays);
  return steps
    .map(([daysBefore, task]) => {
      const offset = daysBefore > 0 ? Math.round(daysBefore * scale) : daysBefore;
      const date = new Date(event.getTime() - offset * MS_PER_DAY);
      return { date: toISO(date < start ? start : date), task, daysBefore: offset };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildChecklist(type) {
  return VENDORS[type].map(([vendor, items]) => ({ vendor, items }));
}

export function buildPlan(input, today = new Date()) {
  const { eventType, budget, guests, eventDate } = input;
  return {
    eventType,
    guests,
    eventDate,
    budget: {
      total: budget,
      perGuest: Math.round(budget / guests),
      breakdown: allocateBudget(eventType, budget),
    },
    timeline: buildTimeline(eventType, eventDate, today),
    vendorChecklist: buildChecklist(eventType),
  };
}
