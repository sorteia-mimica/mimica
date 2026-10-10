import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PADRAO } from '../js/config.js';
import {
  VERSAO_ESTADO, criarPartida, nomeDoTime, vezesPorVolta, totalDeVezes, vezAtual,
  sortear, registrarVez, terminou, placar, retomar, partidaCompativel,
} from '../js/jogo.js';
import { rngSemente, temaFalso } from './ajuda.js';

const TEMAS = ['a', 'b', 'c'].map((id) => temaFalso(id));
const base = () => ({ temas: ['a', 'b', 'c'], ...structuredClone(PADRAO) });
const individual = (n = 3, extra = {}) => ({
  ...base(), modo: 'individual', voltas: 2,
  times: Array.from({ length: n }, (_, i) => ({ membros: [`J${i + 1}`] })), ...extra,
});
const duplas = (extra = {}) => ({
  ...base(), modo: 'duplas', voltas: 1,
  times: [{ membros: ['Ana', 'Beto'] }, { membros: ['Caio', 'Duda'] }], ...extra,
});
const item = (dificuldade) => ({ temaId: 'a', temaNome: 'A', emoji: '⭐', dificuldade, texto: `x-${dificuldade}` });
const comItens = (estado) => ({ ...estado, itensDaVez: [item('facil'), item('medio'), item('dificil')] });
const acertos = (...flags) => flags.map((f) => (typeof f === 'number' ? { acertou: true, acertouTime: f } : { acertou: f, acertouTime: null }));

test('criarPartida zera tudo', () => {
  const e = criarPartida(duplas());
  assert.equal(e.versao, VERSAO_ESTADO);
  assert.equal(e.vezIndice, 0);
  assert.deepEqual(e.pontos, [0, 0]);
  assert.equal(e.itensDaVez, null);
  assert.deepEqual(e.historico, []);
});

test('nomeDoTime', () => {
  assert.equal(nomeDoTime({ membros: ['Ana', 'Beto'] }), 'Ana & Beto');
  assert.equal(nomeDoTime({ membros: ['Ana'] }), 'Ana');
});

test('individual: ordem cadastrada, volta avança, ninguém fixo adivinhando', () => {
  let e = criarPartida(individual(3));
  const vistas = [];
  for (let i = 0; i < 4; i++) {
    vistas.push(vezAtual(e));
    e = registrarVez(comItens(e), acertos(false, false, false));
  }
  assert.deepEqual(vistas.map((v) => v.quemFaz), ['J1', 'J2', 'J3', 'J1']);
  assert.deepEqual(vistas.map((v) => v.volta), [1, 1, 1, 2]);
  assert.ok(vistas.every((v) => v.quemAdivinha === null));
  assert.equal(vezesPorVolta(individual(3)), 3);
  assert.equal(totalDeVezes(individual(3)), 6);
});

test('duplas: alterna duplas e inverte quem faz', () => {
  let e = criarPartida(duplas());
  const vistas = [];
  for (let i = 0; i < 4; i++) {
    vistas.push(vezAtual(e));
    e = registrarVez(comItens(e), acertos(false, false, false));
  }
  assert.deepEqual(vistas.map((v) => [v.time, v.quemFaz, v.quemAdivinha]), [
    [0, 'Ana', 'Beto'], [1, 'Caio', 'Duda'], [0, 'Beto', 'Ana'], [1, 'Duda', 'Caio'],
  ]);
  assert.ok(vistas.every((v) => v.volta === 1));
  assert.equal(vezesPorVolta(duplas()), 4);
  assert.equal(terminou(e), true);
});

test('duplas: pontos vão para a dupla de quem fez', () => {
  const e = registrarVez(comItens(criarPartida(duplas())), acertos(true, false, true));
  assert.deepEqual(e.pontos, [5, 0]);
  const reg = e.historico.at(-1);
  assert.equal(reg.ganhos, 5);
  assert.equal(reg.quemFaz, 'Ana');
  assert.deepEqual(reg.itens.map((i) => i.acertou), [true, false, true]);
  assert.equal(e.itensDaVez, null);
  assert.equal(e.vezIndice, 1);
});

test('individual: quem fez e quem acertou pontuam', () => {
  const e = registrarVez(comItens(criarPartida(individual(3))), [
    { acertou: false, acertouTime: null },
    { acertou: true, acertouTime: 2 },
    { acertou: false, acertouTime: null },
  ]);
  assert.deepEqual(e.pontos, [2, 0, 2]);
  assert.equal(e.historico.at(-1).itens[1].acertouTime, 2);
});

test('individual: acertouTime igual a quem fez conta uma vez só', () => {
  const e = registrarVez(comItens(criarPartida(individual(2))), acertos(0, false, false));
  assert.deepEqual(e.pontos, [1, 0]);
});

test('pontos personalizados', () => {
  const e = registrarVez(comItens(criarPartida(duplas({ pontos: { facil: 2, medio: 4, dificil: 5 } }))), acertos(true, true, true));
  assert.deepEqual(e.pontos, [11, 0]);
});

test('registrarVez sem sorteio lança erro', () => {
  assert.throws(() => registrarVez(criarPartida(duplas()), []), /Nenhum item sorteado/);
});

test('sortear preenche itensDaVez e usados', () => {
  const e = sortear(criarPartida(duplas()), TEMAS, rngSemente(1));
  assert.equal(e.itensDaVez.length, 3);
  assert.equal(Object.values(e.usados).flat().length, 3);
});

test('placar ordenado com empate dividindo posição', () => {
  const e = { ...criarPartida(individual(3)), pontos: [3, 5, 3] };
  assert.deepEqual(placar(e).map((l) => [l.nome, l.pontos, l.posicao]), [['J2', 5, 1], ['J1', 3, 2], ['J3', 3, 2]]);
});

test('estado sobrevive a JSON', () => {
  const e = sortear(criarPartida(duplas()), TEMAS, rngSemente(2));
  const copia = JSON.parse(JSON.stringify(e));
  assert.deepEqual(copia, e);
  assert.deepEqual(vezAtual(copia), vezAtual(e));
});

test('retomar descarta os itens da vez em andamento', () => {
  const e = retomar(sortear(criarPartida(duplas()), TEMAS, rngSemente(3)));
  assert.equal(e.itensDaVez, null);
  assert.equal(Object.values(e.usados).flat().length, 3);
});

test('partidaCompativel rejeita estado inválido', () => {
  const ok = criarPartida(duplas());
  assert.equal(partidaCompativel(ok, TEMAS), true);
  assert.equal(partidaCompativel(null, TEMAS), false);
  assert.equal(partidaCompativel({ ...ok, versao: 99 }, TEMAS), false);
  assert.equal(partidaCompativel({ ...ok, pontos: [0] }, TEMAS), false);
  assert.equal(partidaCompativel({ ...ok, vezIndice: 'x' }, TEMAS), false);
  assert.equal(partidaCompativel(criarPartida(duplas({ temas: ['sumiu'] })), TEMAS), false);
  assert.equal(partidaCompativel({ ...ok, config: { ...ok.config, times: [] } }, TEMAS), false);
});

test('partidaCompativel não estoura com estado corrompido', () => {
  const ok = criarPartida(duplas());
  assert.equal(partidaCompativel({ ...ok, config: { ...ok.config, times: [null] } }, TEMAS), false);
  assert.equal(partidaCompativel({ ...ok, vezIndice: -1 }, TEMAS), false);
});

test('partidaCompativel rejeita historico, pontos, usados e itensDaVez corrompidos', () => {
  const ok = criarPartida(duplas());
  const ruim = (extra) => assert.equal(partidaCompativel({ ...ok, ...extra }, TEMAS), false, JSON.stringify(extra));
  ruim({ historico: null });
  ruim({ historico: {} });
  ruim({ historico: undefined });
  ruim({ pontos: [0, 'x'] });
  ruim({ pontos: [0, 1.5] });
  ruim({ pontos: [0, null] });
  ruim({ usados: null });
  ruim({ usados: [] });
  ruim({ usados: 'x' });
  ruim({ usados: { 'a:facil': 'texto' } });
  ruim({ usados: { 'a:facil': [1, 2] } });
  ruim({ itensDaVez: {} });
  ruim({ itensDaVez: 'x' });
  assert.equal(partidaCompativel({ ...ok, itensDaVez: [] }, TEMAS), true);
  assert.equal(partidaCompativel({ ...ok, usados: { 'a:facil': ['x'] } }, TEMAS), true);
});
