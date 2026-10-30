import { EVENT_TYPES } from './planner.js';

const MAX_TEXT = 500;

/** Strip control characters and collapse whitespace. */
export function sanitizeText(value, max = MAX_TEXT) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Validate and normalise request input.
 * @returns {{ok: true, value: object} | {ok: false, errors: string[]}}
 */
export function validatePlanInput(body, today = new Date()) {
  const errors = [];
  const b = body && typeof body === 'object' ? body : {};

  const eventType = String(b.eventType ?? '').toLowerCase();
  if (!EVENT_TYPES.includes(eventType)) errors.push(`eventType must be one of: ${EVENT_TYPES.join(', ')}`);

  const budget = Number(b.budget);
  if (!Number.isInteger(budget) || budget < 1000 || budget > 1_000_000_000) {
    errors.push('budget must be a whole number between 1,000 and 1,000,000,000');
  }

  const guests = Number(b.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > 5000) errors.push('guests must be a whole number between 1 and 5000');

  const eventDate = String(b.eventDate ?? '');
  const parsed = new Date(`${eventDate}T00:00:00Z`);
  const isoOk = /^\d{4}-\d{2}-\d{2}$/.test(eventDate) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === eventDate;
  const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (!isoOk) errors.push('eventDate must be a valid date in YYYY-MM-DD format');
  else if (parsed < todayUTC) errors.push('eventDate must not be in the past');

  const city = sanitizeText(b.city, 80);
  const preferences = sanitizeText(b.preferences, MAX_TEXT);

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { eventType, budget, guests, eventDate, city, preferences } };
}
