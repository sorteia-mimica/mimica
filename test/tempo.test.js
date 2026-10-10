import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAnunciadorDeSegundos, formatarTempo, iniciarCronometro } from '../js/tempo.js';

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

test('anunciador toca uma vez por segundo inteiro, só nos últimos N', () => {
  const anunciar = criarAnunciadorDeSegundos(3);
  assert.equal(anunciar(5), null);
  assert.equal(anunciar(3.4), null); // ceil = 4: fora da janela
  assert.equal(anunciar(3), 3);
  assert.equal(anunciar(2.8), null); // ainda é o segundo 3 (ceil)
  assert.equal(anunciar(2.2), null);
  assert.equal(anunciar(1.8), 2);
  assert.equal(anunciar(1.2), null);
  assert.equal(anunciar(0.4), 1);
  assert.equal(anunciar(0), null); // no zero quem toca é a buzina
});

test('anunciador não repete nem volta atrás (re-render, resume)', () => {
  const anunciar = criarAnunciadorDeSegundos(10);
  assert.equal(anunciar(7.5), 8);
  assert.equal(anunciar(8.9), null); // relógio "voltou": não repete
  assert.equal(anunciar(7.1), null);
  assert.equal(anunciar(2.5), 3); // saltou do 8 pro 3 em segundo plano: toca só uma vez
  assert.equal(anunciar(2.4), null);
});
