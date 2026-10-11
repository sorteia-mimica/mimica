import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escolher, comNome, FRASES, tipoDeVitoria, fraseLanterna } from '../js/frases.js';

test('escolher devolve um item da lista', () => {
  const lista = ['a', 'b', 'c'];
  for (let i = 0; i < 50; i++) assert.ok(lista.includes(escolher(lista)));
});

test('escolher com rng fixo é determinístico', () => {
  const lista = ['a', 'b', 'c', 'd'];
  assert.equal(escolher(lista, () => 0), 'a');
  assert.equal(escolher(lista, () => 0.5), 'c');
  assert.equal(escolher(lista, () => 0.9999), 'd');
});

test('escolher com lista de 1 item devolve esse item', () => {
  assert.equal(escolher(['só'], () => 0.7), 'só');
});

test('FRASES: cada grupo tem de 3 a 5 frases não vazias', () => {
  for (const [grupo, lista] of Object.entries(FRASES)) {
    assert.ok(Array.isArray(lista) && lista.length >= 3 && lista.length <= 5, `${grupo} com ${lista.length}`);
    assert.ok(lista.every((f) => typeof f === 'string' && f.trim() !== ''), grupo);
  }
});

test('comNome escapa a frase e o nome e destaca o nome', () => {
  assert.equal(comNome('Valeu, {nome}!', '<Ana>'), 'Valeu, <b>&lt;Ana&gt;</b>!');
  assert.equal(comNome('Sem nome & sem placeholder', 'Ana'), 'Sem nome &amp; sem placeholder');
});

test('comNome não interpreta padrões especiais de replace no nome', () => {
  assert.equal(comNome('Oi, {nome}!', '$&'), 'Oi, <b>$&amp;</b>!');
  assert.equal(comNome('Oi, {nome}!', "$'"), 'Oi, <b>$&#39;</b>!');
});

const linhas = (...pontos) => pontos.map((p, i) => ({ time: i, nome: `T${i}`, pontos: p, posicao: 0 }))
  .map((l, i, ls) => ({ ...l, posicao: ls.findIndex((x) => x.pontos === l.pontos) + 1 }));

test('tipoDeVitoria: margem pequena é apertada, lavada é folgada', () => {
  assert.equal(tipoDeVitoria(linhas(34, 33)), 'apertada');
  assert.equal(tipoDeVitoria(linhas(10, 8, 2)), 'apertada');
  assert.equal(tipoDeVitoria(linhas(30, 24)), 'normal');
  assert.equal(tipoDeVitoria(linhas(30, 20)), 'folgada');
  assert.equal(tipoDeVitoria(linhas(9, 3)), 'folgada');
  assert.equal(tipoDeVitoria(linhas(5, 0)), 'normal', 'placar baixo: 5 a 0 não é lavada histórica');
  assert.equal(tipoDeVitoria(linhas(60, 50)), 'normal');
});

test('"Vitória incontestável" só aparece na lista de vitória folgada', () => {
  const tem = (lista) => lista.some((f) => f.includes('incontestável'));
  assert.equal(tem(FRASES.vitoria), false);
  assert.equal(tem(FRASES.vitoriaApertada), false);
  assert.equal(tem(FRASES.vitoriaFolgada), true);
});

test('fraseLanterna: só com um único último colocado (e alguém acima)', () => {
  assert.equal(fraseLanterna(linhas(5, 5)), null);
  assert.equal(fraseLanterna(linhas(9, 3, 3)), null);
  assert.ok(fraseLanterna(linhas(9, 5, 3)).includes('{nome}'));
});

test('fraseLanterna: concorda no plural (dupla "ficaram") e nunca deixa {ficou}', () => {
  for (let i = 0; i < 20; i++) {
    const rng = () => i / 20;
    const sing = fraseLanterna(linhas(20, 3), { plural: false, rng });
    const plur = fraseLanterna(linhas(20, 3), { plural: true, rng });
    assert.doesNotMatch(sing, /\{ficou\}|\bficaram\b/);
    assert.doesNotMatch(plur, /\{ficou\}/);
    assert.doesNotMatch(plur, /\bficou\b/);
  }
  const todas = [...FRASES.lanterna, ...FRASES.lanternaPerto];
  assert.ok(todas.some((f) => f.includes('{ficou}')));
  assert.ok(todas.every((f) => !/\bficou\b/.test(f.replaceAll('{ficou}', ''))), 'verbo sempre pelo marcador');
});

test('fraseLanterna: perdeu por pouco não é "lá no fundo"', () => {
  for (let i = 0; i < 20; i++) {
    const f = fraseLanterna(linhas(29, 28), { rng: () => i / 20 });
    assert.ok(FRASES.lanternaPerto.some((p) => p.replace('{ficou}', 'ficou') === f), f);
  }
  for (let i = 0; i < 20; i++) {
    const f = fraseLanterna(linhas(29, 10), { rng: () => i / 20 });
    assert.ok(FRASES.lanterna.some((p) => p.replace('{ficou}', 'ficou') === f), f);
  }
});
