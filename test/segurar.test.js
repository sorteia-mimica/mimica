import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarSegurar } from '../js/segurar.js';

// Relógio falso: `passar(ms)` avança o tempo e dispara os timers vencidos.
function relogioFalso() {
  let t = 0;
  let proximo = 1;
  const timers = new Map();
  return {
    agora: () => t,
    agendar: (fn, ms) => { const id = proximo++; timers.set(id, { fn, quando: t + ms }); return id; },
    desagendar: (id) => timers.delete(id),
    passar(ms) {
      t += ms;
      for (const [id, { fn, quando }] of [...timers]) {
        if (quando <= t) { timers.delete(id); fn(); }
      }
    },
  };
}

const novo = (extra = {}) => {
  const r = relogioFalso();
  let completou = 0;
  const s = criarSegurar({ ms: 600, aoCompletar: () => { completou++; }, ...r, ...extra });
  return { r, s, completou: () => completou };
};

test('segurar o tempo todo completa uma vez', () => {
  const { r, s, completou } = novo();
  s.iniciar();
  r.passar(599);
  assert.equal(completou(), 0);
  r.passar(1);
  assert.equal(completou(), 1);
  assert.equal(s.completo, true);
});

test('soltar antes do tempo cancela e zera o progresso', () => {
  const { r, s, completou } = novo();
  s.iniciar();
  r.passar(300);
  assert.equal(s.progresso(), 0.5);
  s.soltar();
  assert.equal(s.progresso(), 0);
  r.passar(1000);
  assert.equal(completou(), 0);
  assert.equal(s.completo, false);
});

test('recomeçar depois de soltar conta do zero', () => {
  const { r, s, completou } = novo();
  s.iniciar();
  r.passar(500);
  s.soltar();
  s.iniciar();
  r.passar(500);
  assert.equal(completou(), 0);
  r.passar(100);
  assert.equal(completou(), 1);
});

test('iniciar de novo enquanto segura (repetição de tecla) não reinicia a contagem', () => {
  const { r, s, completou } = novo();
  s.iniciar();
  r.passar(400);
  s.iniciar();
  r.passar(200);
  assert.equal(completou(), 1);
});

test('progresso vai de 0 a 1 e trava em 1 depois de completar', () => {
  const { r, s } = novo();
  assert.equal(s.progresso(), 0);
  s.iniciar();
  r.passar(150);
  assert.equal(s.progresso(), 0.25);
  r.passar(1000);
  assert.equal(s.progresso(), 1);
  s.soltar(); // soltar depois de completo não desfaz
  assert.equal(s.progresso(), 1);
});

test('depois de completo é de uma vez só: iniciar não completa de novo', () => {
  const { r, s, completou } = novo();
  s.iniciar();
  r.passar(600);
  s.soltar();
  s.iniciar();
  r.passar(600);
  assert.equal(completou(), 1);
});

test('completarJa (atalho acessível) completa na hora, uma vez', () => {
  const { r, s, completou } = novo();
  s.completarJa();
  assert.equal(completou(), 1);
  s.iniciar();
  r.passar(600);
  s.completarJa();
  assert.equal(completou(), 1);
});

test('segurando: verdadeiro só entre iniciar e soltar/completar', () => {
  const { r, s } = novo();
  assert.equal(s.segurando, false);
  s.iniciar();
  assert.equal(s.segurando, true);
  s.soltar();
  assert.equal(s.segurando, false);
  s.iniciar();
  r.passar(600);
  assert.equal(s.segurando, false);
});
