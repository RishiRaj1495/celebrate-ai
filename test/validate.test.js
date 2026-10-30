import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlanInput, sanitizeText } from '../src/validate.js';

const TODAY = new Date('2026-10-30T10:00:00Z');
const good = { eventType: 'Wedding', budget: 500000, guests: 100, eventDate: '2027-01-10', city: 'Dhanbad', preferences: 'vegetarian' };

test('accepts valid input and normalises event type', () => {
  const r = validatePlanInput(good, TODAY);
  assert.equal(r.ok, true);
  assert.equal(r.value.eventType, 'wedding');
});

test('rejects bad values with clear messages', () => {
  const r = validatePlanInput({ eventType: 'party', budget: 5, guests: 0, eventDate: '2020-01-01' }, TODAY);
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 4);
});

test('rejects impossible calendar dates', () => {
  assert.equal(validatePlanInput({ ...good, eventDate: '2027-02-31' }, TODAY).ok, false);
});

test('rejects non-integer and non-object input', () => {
  assert.equal(validatePlanInput({ ...good, guests: 10.5 }, TODAY).ok, false);
  assert.equal(validatePlanInput(null, TODAY).ok, false);
});

test('sanitizeText strips control characters and truncates', () => {
  assert.equal(sanitizeText('a\u0000b\n\nc'), 'a b c');
  assert.equal(sanitizeText('x'.repeat(1000), 10).length, 10);
});
