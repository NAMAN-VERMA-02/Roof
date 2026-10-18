import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEndDate, statusFor, validDate } from '../src/lib/dates.js';

test('warranty dates use calendar months and a last covered day', () => {
  assert.equal(calculateEndDate('2025-01-01', 12), '2025-12-31');
  assert.equal(calculateEndDate('2024-02-29', 12), '2025-02-27');
  assert.equal(validDate('2025-02-29'), false);
});

test('coverage remains active on its end date', () => {
  assert.equal(statusFor({ warrantyEndDate: '2026-10-18' }, '2026-10-18'), 'expiring');
  assert.equal(statusFor({ warrantyEndDate: '2026-10-17' }, '2026-10-18'), 'expired');
  assert.equal(statusFor({ warrantyEndDate: '' }, '2026-10-18'), 'incomplete');
});
