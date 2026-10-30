import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocateBudget, buildTimeline, buildPlan, EVENT_TYPES } from '../src/planner.js';

const TODAY = new Date('2026-10-30T10:00:00Z');

test('budget breakdown sums exactly to the total for every event type', () => {
  for (const type of EVENT_TYPES) {
    for (const total of [1000, 99_999, 500_000, 1_234_567]) {
      const sum = allocateBudget(type, total).reduce((s, r) => s + r.amount, 0);
      assert.equal(sum, total, `${type} ${total}`);
    }
  }
});

test('budget always includes a contingency line', () => {
  for (const type of EVENT_TYPES) {
    assert.ok(allocateBudget(type, 100_000).some((r) => r.category === 'Contingency'));
  }
});

test('timeline is sorted and never schedules tasks in the past', () => {
  for (const type of EVENT_TYPES) {
    const tl = buildTimeline(type, '2026-11-15', TODAY);
    const dates = tl.map((t) => t.date);
    assert.deepEqual(dates, [...dates].sort());
    assert.ok(dates.every((d) => d >= '2026-10-30'));
  }
});

test('timeline keeps full lead time when the event is far away', () => {
  const tl = buildTimeline('birthday', '2027-03-01', TODAY);
  assert.equal(tl[0].date, '2027-01-15'); // 45 days before
  assert.equal(tl.at(-1).date, '2027-03-01');
});

test('buildPlan returns budget, timeline and checklist', () => {
  const plan = buildPlan({ eventType: 'wedding', budget: 800_000, guests: 200, eventDate: '2027-02-14' }, TODAY);
  assert.equal(plan.budget.perGuest, 4000);
  assert.ok(plan.timeline.length > 5);
  assert.ok(plan.vendorChecklist.length > 0);
});
