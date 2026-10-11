import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PADRAO } from '../js/config.js';
import {
  VERSAO_ESTADO, criarPartida, nomeDoTime, vezesPorVolta, totalDeVezes, vezAtual,
  sortear, registrarVez, terminou, placar, retomar, partidaCompativel,
  usadosValidos, empatadosNoTopo, iniciarDesempate, resultadoDesempate,
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

// Sem repetir item entre partidas

test('criarPartida semeia os usados da partida anterior (sem dividir referência)', () => {
  const anteriores = { 'a:facil': ['a-facil-0'] };
  const e = criarPartida(duplas(), anteriores);
  assert.deepEqual(e.usados, anteriores);
  assert.notEqual(e.usados, anteriores);
  assert.notEqual(e.usados['a:facil'], anteriores['a:facil']);
  assert.deepEqual(criarPartida(duplas()).usados, {});
});

test('usadosValidos aproveita o que presta e ignora lixo do storage', () => {
  assert.deepEqual(usadosValidos(null), {});
  assert.deepEqual(usadosValidos(undefined), {});
  assert.deepEqual(usadosValidos('x'), {});
  assert.deepEqual(usadosValidos([['a:facil', ['x']]]), {});
  assert.deepEqual(usadosValidos({ 'a:facil': 'x' }), {});
  assert.deepEqual(usadosValidos({ 'a:facil': ['x', 2] }), {});
  assert.deepEqual(usadosValidos({ 'a:facil': ['x'], 'b:medio': [] }), { 'a:facil': ['x'], 'b:medio': [] });
});

test('a partida seguinte não repete os itens da anterior; ao esgotar, reembaralha', () => {
  const config = duplas({ temas: ['a'] }); // 5 itens por dificuldade, 1 de cada por vez
  const rng = rngSemente(7);
  const sorteados = (e) => e.itensDaVez.map((i) => i.texto);
  let primeira = criarPartida(config);
  const daPrimeira = [];
  for (let i = 0; i < 2; i++) {
    primeira = sortear(primeira, TEMAS, rng);
    daPrimeira.push(...sorteados(primeira));
  }
  let segunda = criarPartida(config, JSON.parse(JSON.stringify(primeira.usados)));
  const daSegunda = [];
  for (let i = 0; i < 3; i++) {
    segunda = sortear(segunda, TEMAS, rng);
    daSegunda.push(...sorteados(segunda));
  }
  assert.equal(new Set([...daPrimeira, ...daSegunda]).size, 15, 'as 5 primeiras vezes cobrem os 15 itens sem repetir');
  segunda = sortear(segunda, TEMAS, rng); // lista esgotada: recomeça o ciclo
  assert.equal(segunda.itensDaVez.length, 3);
  assert.ok(Object.values(segunda.usados).every((l) => l.length === 1));
});

// Desempate

const empatada = () => {
  let e = criarPartida(individual(3, { voltas: 1 }));
  e = registrarVez(comItens(e), acertos(true, false, false)); // J1 +1
  e = registrarVez(comItens(e), acertos(false, false, false)); // J2 0
  e = registrarVez(comItens(e), acertos(true, false, false)); // J3 +1
  return e;
};

test('empatadosNoTopo lista quem divide o 1º lugar', () => {
  assert.deepEqual(empatadosNoTopo(empatada()), [0, 2]);
  assert.deepEqual(empatadosNoTopo({ ...criarPartida(individual(3)), pontos: [1, 5, 2] }), [1]);
});

test('desempate: cada empatado faz 1 vez extra com 1 item difícil, pontos à parte', () => {
  let e = iniciarDesempate(empatada());
  assert.equal(terminou(e), false);
  assert.deepEqual(e.desempate, { times: [0, 2], vez: 0, pontos: [0, 0] });
  const v = vezAtual(e);
  assert.equal(v.desempate, true);
  assert.equal(v.time, 0);
  assert.equal(v.quemFaz, 'J1');

  e = sortear(e, TEMAS, rngSemente(4));
  assert.equal(e.itensDaVez.length, 1);
  assert.equal(e.itensDaVez[0].dificuldade, 'dificil');
  // J2 (fora do desempate) acertou: no desempate só quem faz pontua.
  e = registrarVez(e, [{ acertou: true, acertouTime: 1 }]);
  assert.deepEqual(e.pontos, [1, 0, 1], 'placar principal intocado');
  assert.deepEqual(e.desempate.pontos, [4, 0]);
  assert.equal(e.historico.at(-1).desempate, true);
  assert.equal(e.historico.at(-1).ganhos, 4);
  assert.equal(e.vezIndice, 3);
  assert.equal(vezAtual(e).quemFaz, 'J3');
  assert.equal(terminou(e), false);

  e = registrarVez(sortear(e, TEMAS, rngSemente(5)), [{ acertou: false }]);
  assert.equal(terminou(e), true);
  const r = resultadoDesempate(e);
  assert.deepEqual(r.vencedores, [0]);
  assert.deepEqual(r.placar.map((l) => [l.nome, l.pontos, l.posicao]), [['J1', 4, 1], ['J3', 0, 2]]);
});

test('desempate: se empatar de novo, a vitória é dividida', () => {
  let e = iniciarDesempate(empatada());
  e = registrarVez(sortear(e, TEMAS, rngSemente(1)), [{ acertou: true, acertouTime: 2 }]);
  e = registrarVez(sortear(e, TEMAS, rngSemente(2)), [{ acertou: true, acertouTime: 0 }]);
  assert.deepEqual(e.desempate.pontos, [4, 4]);
  assert.deepEqual(resultadoDesempate(e).vencedores, [0, 2]);
});

test('desempate em duplas: o primeiro da dupla faz, o parceiro adivinha', () => {
  let e = criarPartida(duplas());
  for (let i = 0; i < 4; i++) e = registrarVez(comItens(e), acertos(false, false, false));
  e = iniciarDesempate(e);
  assert.deepEqual(e.desempate.times, [0, 1]);
  assert.deepEqual([vezAtual(e).quemFaz, vezAtual(e).quemAdivinha], ['Ana', 'Beto']);
  e = registrarVez(sortear(e, TEMAS, rngSemente(1)), [{ acertou: true, acertouTime: null }]);
  assert.deepEqual([vezAtual(e).quemFaz, vezAtual(e).quemAdivinha], ['Caio', 'Duda']);
  assert.deepEqual(e.desempate.pontos, [4, 0]);
});

test('iniciarDesempate sem empate, antes do fim ou já desempatado não muda nada', () => {
  const sem = { ...criarPartida(individual(3, { voltas: 1 })), vezIndice: 3, pontos: [1, 5, 2] };
  assert.equal(iniciarDesempate(sem), sem);
  const noMeio = criarPartida(individual(3));
  assert.equal(iniciarDesempate(noMeio), noMeio);
  const ja = iniciarDesempate(empatada());
  assert.equal(iniciarDesempate(ja), ja);
  assert.equal(resultadoDesempate(sem), null);
  assert.equal(resultadoDesempate(ja), null, 'sem resultado antes de todos jogarem');
});

test('desempate sobrevive a JSON, retomar e partidaCompativel', () => {
  const e = sortear(iniciarDesempate(empatada()), TEMAS, rngSemente(3));
  const copia = JSON.parse(JSON.stringify(e));
  assert.deepEqual(copia, e);
  assert.equal(partidaCompativel(copia, TEMAS), true);
  const r = retomar(copia);
  assert.equal(r.itensDaVez, null);
  assert.deepEqual(vezAtual(r), vezAtual(e));
});

test('partidaCompativel: save antigo sem desempate vale; desempate corrompido não', () => {
  const ok = empatada();
  assert.equal('desempate' in ok, false);
  assert.equal(partidaCompativel(ok, TEMAS), true);
  assert.equal(partidaCompativel({ ...ok, desempate: null }, TEMAS), true);
  const ruim = (desempate) => assert.equal(partidaCompativel({ ...ok, desempate }, TEMAS), false, JSON.stringify(desempate));
  ruim('x');
  ruim([]);
  ruim({ times: [0], vez: 0, pontos: [0] });
  ruim({ times: [0, 9], vez: 0, pontos: [0, 0] });
  ruim({ times: [0, 0], vez: 0, pontos: [0, 0] });
  ruim({ times: [0, 2], vez: 3, pontos: [0, 0] });
  ruim({ times: [0, 2], vez: 0, pontos: [0] });
  ruim({ times: [0, 2], vez: 0, pontos: [0, 'x'] });
});
