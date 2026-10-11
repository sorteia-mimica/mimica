import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PADRAO } from '../js/config.js';
import { criarPartida, registrarVez, sortear, iniciarDesempate } from '../js/jogo.js';
import { premios, juntarNomes } from '../js/premios.js';
import { rngSemente, temaFalso } from './ajuda.js';

const base = () => ({ temas: ['a'], ...structuredClone(PADRAO), voltas: 1 });
const individual = (n = 3) => ({ ...base(), modo: 'individual', times: Array.from({ length: n }, (_, i) => ({ membros: [`J${i + 1}`] })) });
const duplas = () => ({ ...base(), modo: 'duplas', times: [{ membros: ['Ana', 'Beto'] }, { membros: ['Caio', 'Duda'] }] });
const item = (dificuldade) => ({ temaId: 'a', temaNome: 'A', emoji: '⭐', dificuldade, texto: `x-${dificuldade}` });

// Joga as vezes em ordem; cada vez é uma lista [fácil, médio, difícil] de false | true | índice de quem acertou.
function jogar(config, vezes) {
  let e = criarPartida(config);
  for (const flags of vezes) {
    e = { ...e, itensDaVez: [item('facil'), item('medio'), item('dificil')] };
    e = registrarVez(e, flags.map((f) => (typeof f === 'number' ? { acertou: true, acertouTime: f } : { acertou: f, acertouTime: null })));
  }
  return e;
}
const porId = (lista) => Object.fromEntries(lista.map((p) => [p.id, p]));

test('juntarNomes', () => {
  assert.equal(juntarNomes(['A']), 'A');
  assert.equal(juntarNomes(['A', 'B']), 'A e B');
  assert.equal(juntarNomes(['A', 'B', 'C']), 'A, B e C');
});

test('partida sem nenhum acerto não dá prêmio pra ninguém', () => {
  const e = jogar(individual(3), [[false, false, false], [false, false, false], [false, false, false]]);
  // Todo mundo zerou igual: nem "Travou geral" (seria prêmio pra todo mundo).
  assert.deepEqual(premios(e), []);
});

test('individual: mímica de ouro, leitor de mentes, item cabeludo e travou geral', () => {
  const e = jogar(individual(3), [
    [1, false, 1], // J1 faz: J2 acerta fácil e difícil → J1 ganha 5
    [false, false, false], // J2 zera
    [1, 0, false], // J3 faz: J2 acerta fácil, J1 acerta médio → 3
  ]);
  const p = porId(premios(e));
  assert.deepEqual(Object.keys(p), ['ouro', 'leitor', 'cabeludo', 'travou']);
  assert.equal(p.ouro.quem, 'J1');
  assert.match(p.ouro.detalhe, /\+5 pontos/);
  assert.equal(p.leitor.quem, 'J2');
  assert.match(p.leitor.detalhe, /3 itens/);
  assert.equal(p.cabeludo.quem, '“x-dificil”');
  assert.match(p.cabeludo.detalhe, /J1 fez e J2 matou/);
  assert.equal(p.travou.quem, 'J2');
  for (const premio of premios(e)) {
    assert.ok(premio.emoji && premio.titulo && premio.quem && premio.detalhe, JSON.stringify(premio));
  }
});

test('no máximo 4 prêmios; gabarito aparece quando sobra espaço', () => {
  const e = jogar(duplas(), [
    [true, true, true], // Ana gabarita
    [false, false, false], // Caio zera
    [true, false, false], // Beto
    [true, false, false], // Duda
  ]);
  const p = porId(premios(e));
  assert.deepEqual(Object.keys(p), ['ouro', 'cabeludo', 'travou', 'gabarito']);
  assert.equal(p.cabeludo.detalhe, 'Ana fez e Beto matou a charada');
  assert.equal(p.gabarito.quem, 'Ana');
  assert.equal(p.travou.quem, 'Caio');
  assert.ok(premios(e).length <= 4);
});

test('duplas não têm leitor de mentes; empate no topo junta os nomes', () => {
  const e = jogar(duplas(), [[true, false, false], [true, false, false], [false, false, false], [false, false, false]]);
  const p = porId(premios(e));
  assert.equal(p.leitor, undefined);
  assert.equal(p.ouro.quem, 'Ana e Caio');
  assert.equal(p.travou.quem, 'Beto e Duda');
  assert.equal(p.cabeludo, undefined, 'nenhum difícil acertado');
});

test('individual: difícil acertado sem quem acertou marcado vira "a galera"', () => {
  const e = jogar(individual(2), [[false, false, true], [false, false, false]]);
  assert.equal(porId(premios(e)).cabeludo.detalhe, 'J1 fez e a galera matou a charada');
});

test('gabarito não vale com 1 item por vez', () => {
  const config = { ...duplas(), mix: { facil: 0, medio: 0, dificil: 1 } };
  let e = criarPartida(config);
  for (const acertou of [true, false, false, false]) {
    e = registrarVez({ ...e, itensDaVez: [item('dificil')] }, [{ acertou }]);
  }
  assert.equal(porId(premios(e)).gabarito, undefined);
});

test('prêmio que iria pra todo mundo não sai; nomes na ordem de cadastro', () => {
  // Cada um faz 1 ponto e adivinha 1 item: ouro e leitor seriam de todos.
  const todos = jogar(individual(3), [[1, false, false], [2, false, false], [0, false, false]]);
  assert.deepEqual(premios(todos), []);
  const dois = jogar(individual(3), [[2, false, false], [false, false, false], [0, false, false]]);
  assert.equal(porId(premios(dois)).leitor.quem, 'J1 e J3');
});

test('vezes do desempate não entram nos prêmios', () => {
  const temas = [temaFalso('a')];
  let e = jogar(individual(3), [[true, false, false], [false, false, false], [true, false, false]]);
  e = iniciarDesempate(e);
  e = registrarVez(sortear(e, temas, rngSemente(1)), [{ acertou: true, acertouTime: 1 }]);
  const p = porId(premios(e));
  assert.equal(p.ouro.quem, 'J1 e J3');
  assert.equal(p.travou.quem, 'J2');
  assert.equal(p.cabeludo, undefined);
  assert.equal(p.leitor, undefined);
});
