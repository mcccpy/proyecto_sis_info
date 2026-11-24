import assert from 'node:assert/strict';
import test from 'node:test';
import { radiosCumplenJerarquia } from './zona-radios.util';

test('acepta radios de cobertura estrictamente crecientes', () => {
  assert.equal(
    radiosCumplenJerarquia({
      radio_good: 1000,
      radio_medio: 3000,
      radio_bad: 5000,
    }),
    true,
  );
});

test('rechaza radios iguales o desordenados', () => {
  assert.equal(
    radiosCumplenJerarquia({
      radio_good: 1000,
      radio_medio: 1000,
      radio_bad: 5000,
    }),
    false,
  );
  assert.equal(
    radiosCumplenJerarquia({
      radio_good: 2000,
      radio_medio: 1000,
      radio_bad: 5000,
    }),
    false,
  );
});
