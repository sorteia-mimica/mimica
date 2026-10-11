import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarArmazenamento } from '../js/armazenamento.js';

function storageFalso() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test('salva, carrega e limpa', () => {
  const a = criarArmazenamento(storageFalso());
  a.salvarPartida({ x: 1 });
  a.salvarConfig({ y: 2 });
  assert.deepEqual(a.carregarPartida(), { x: 1 });
  assert.deepEqual(a.carregarConfig(), { y: 2 });
  a.limparPartida();
  assert.equal(a.carregarPartida(), null);
  assert.deepEqual(a.carregarConfig(), { y: 2 });
});

test('JSON corrompido vira null', () => {
  const s = storageFalso();
  s.setItem('mimica:partida', '{quebrado');
  assert.equal(criarArmazenamento(s).carregarPartida(), null);
});

test('sem storage ou storage que lança não quebra', () => {
  const nulo = criarArmazenamento(null);
  nulo.salvarPartida({ x: 1 });
  assert.equal(nulo.carregarPartida(), null);
  const explode = () => { throw new Error('bloqueado'); };
  const ruim = criarArmazenamento({ getItem: explode, setItem: explode, removeItem: explode });
  ruim.salvarPartida({ x: 1 });
  ruim.limparPartida();
  assert.equal(ruim.carregarPartida(), null);
});

test('usados ficam numa chave própria e sobrevivem a limparPartida', () => {
  const s = storageFalso();
  const a = criarArmazenamento(s);
  a.salvarUsados({ 'a:facil': ['x'] });
  a.limparPartida();
  assert.deepEqual(a.carregarUsados(), { 'a:facil': ['x'] });
  assert.ok(s.m.has('mimica:usados'));
});
