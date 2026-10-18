import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatedEnd, formatDate } from '../src/lib/dates.js';

test('form preview matches calendar month warranty rule', () => {
  assert.equal(calculatedEnd('2025-01-01', 12), '2025-12-31');
  assert.equal(calculatedEnd('2024-02-29', 12), '2025-02-27');
  assert.equal(formatDate('2025-12-31'), '31 Dec 2025');
});
