import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarTempo, iniciarCronometro } from '../js/tempo.js';

test('formatarTempo', () => {
  assert.equal(formatarTempo(90), '1:30');
  assert.equal(formatarTempo(5), '0:05');
  assert.equal(formatarTempo(59.2), '1:00');
  assert.equal(formatarTempo(-3), '0:00');
  assert.equal(formatarTempo(300), '5:00');
});

test('iniciarCronometro segue o relógio mesmo após ficar em segundo plano', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let agora = 0;
  const ticks = [];
  let fins = 0;
  const parar = iniciarCronometro(90, { agora: () => agora, aoTick: (r) => ticks.push(r), aoFim: () => fins++ });
  assert.equal(ticks.at(-1), 90);
  agora = 60_000;
  t.mock.timers.tick(200);
  assert.equal(ticks.at(-1), 30);
  agora = 95_000;
  t.mock.timers.tick(200);
  assert.equal(ticks.at(-1), 0);
  assert.equal(fins, 1);
  t.mock.timers.tick(1000);
  assert.equal(fins, 1);
  parar();
});

test('parar interrompe o cronômetro', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let agora = 0;
  let ticks = 0;
  const parar = iniciarCronometro(10, { agora: () => agora, aoTick: () => ticks++, aoFim: () => {} });
  parar();
  agora = 5000;
  t.mock.timers.tick(1000);
  assert.equal(ticks, 1);
});
