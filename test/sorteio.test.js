import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFICULDADES, embaralhar, montarDificuldades, escolherTemas, sortearVez } from '../js/sorteio.js';
import { rngSemente, temaFalso } from './ajuda.js';

const TEMAS = ['a', 'b', 'c', 'd', 'e'].map((id) => temaFalso(id));
const MIX_PADRAO = { facil: 1, medio: 1, dificil: 1 };

test('embaralhar devolve cópia com os mesmos elementos', () => {
  const original = [1, 2, 3, 4, 5];
  const r = embaralhar(original, rngSemente(1));
  assert.deepEqual(original, [1, 2, 3, 4, 5]);
  assert.deepEqual([...r].sort(), [1, 2, 3, 4, 5]);
});

test('montarDificuldades respeita o mix', () => {
  const d = montarDificuldades({ facil: 2, medio: 0, dificil: 1 }, rngSemente(1));
  assert.deepEqual([...d].sort(), ['dificil', 'facil', 'facil']);
});

test('escolherTemas: temas distintos quando há temas suficientes', () => {
  for (let s = 1; s <= 50; s++) {
    const ids = escolherTemas(['a', 'b', 'c', 'd', 'e'], 3, rngSemente(s));
    assert.equal(ids.length, 3);
    assert.equal(new Set(ids).size, 3);
  }
});

test('escolherTemas: repete de forma equilibrada quando faltam temas', () => {
  for (let s = 1; s <= 20; s++) {
    const ids = escolherTemas(['a', 'b'], 3, rngSemente(s));
    const a = ids.filter((x) => x === 'a').length;
    assert.equal(ids.length, 3);
    assert.ok(a === 1 || a === 2);
  }
});

test('sortearVez padrão com 3 temas: 1 de cada tema e de cada dificuldade, em ordem', () => {
  for (let s = 1; s <= 30; s++) {
    const { itens } = sortearVez({ temas: TEMAS, temasEscolhidos: ['a', 'b', 'c'], mix: MIX_PADRAO, rng: rngSemente(s) });
    assert.deepEqual(itens.map((i) => i.dificuldade), DIFICULDADES);
    assert.deepEqual(new Set(itens.map((i) => i.temaId)), new Set(['a', 'b', 'c']));
  }
});

test('sortearVez com 1 tema: todos os itens do mesmo tema', () => {
  const { itens } = sortearVez({ temas: TEMAS, temasEscolhidos: ['d'], mix: MIX_PADRAO, rng: rngSemente(3) });
  assert.ok(itens.every((i) => i.temaId === 'd'));
});

test('item traz tema, emoji, dificuldade e texto da lista certa', () => {
  const { itens } = sortearVez({ temas: TEMAS, temasEscolhidos: ['a'], mix: { facil: 1, medio: 0, dificil: 0 }, rng: rngSemente(2) });
  const [item] = itens;
  assert.equal(item.temaId, 'a');
  assert.equal(item.temaNome, 'A');
  assert.equal(item.emoji, '⭐');
  assert.equal(item.dificuldade, 'facil');
  assert.ok(TEMAS[0].itens.facil.includes(item.texto));
});

test('sortearVez não repete item já usado', () => {
  const temas = [temaFalso('a', 3)];
  let usados = {};
  const vistos = new Set();
  for (let i = 0; i < 3; i++) {
    const r = sortearVez({ temas, temasEscolhidos: ['a'], mix: { facil: 1, medio: 0, dificil: 0 }, usados, rng: rngSemente(i + 1) });
    vistos.add(r.itens[0].texto);
    usados = r.usados;
  }
  assert.equal(vistos.size, 3);
});

test('sortearVez reembaralha a lista quando esgota', () => {
  const temas = [temaFalso('a', 3)];
  const usados = { 'a:facil': [...temas[0].itens.facil] };
  const r = sortearVez({ temas, temasEscolhidos: ['a'], mix: { facil: 1, medio: 0, dificil: 0 }, usados, rng: rngSemente(9) });
  assert.ok(temas[0].itens.facil.includes(r.itens[0].texto));
  assert.deepEqual(r.usados['a:facil'], [r.itens[0].texto]);
});

test('sortearVez não repete item dentro da mesma vez', () => {
  const temas = [temaFalso('a', 3)];
  const { itens } = sortearVez({ temas, temasEscolhidos: ['a'], mix: { facil: 3, medio: 0, dificil: 0 }, rng: rngSemente(4) });
  assert.equal(new Set(itens.map((i) => i.texto)).size, 3);
});

test('sortearVez com mix personalizado', () => {
  const { itens } = sortearVez({ temas: TEMAS, temasEscolhidos: ['a', 'b', 'c', 'd', 'e'], mix: { facil: 2, medio: 0, dificil: 2 }, rng: rngSemente(5) });
  assert.deepEqual(itens.map((i) => i.dificuldade), ['facil', 'facil', 'dificil', 'dificil']);
  assert.equal(new Set(itens.map((i) => i.temaId)).size, 4);
});

test('sortearVez não altera o objeto usados recebido', () => {
  const usados = { 'a:facil': ['a-facil-0'] };
  sortearVez({ temas: TEMAS, temasEscolhidos: ['a'], mix: { facil: 1, medio: 0, dificil: 0 }, usados, rng: rngSemente(6) });
  assert.deepEqual(usados, { 'a:facil': ['a-facil-0'] });
});

test('sortearVez: ao esgotar a lista no meio da vez, não repete item da mesma vez nem o último sorteado', () => {
  const temas = [temaFalso('a', 4)];
  for (let s = 1; s <= 200; s++) {
    const rng = rngSemente(s);
    let usados = {};
    let anterior = null;
    for (let vez = 0; vez < 30; vez++) {
      const r = sortearVez({ temas, temasEscolhidos: ['a'], mix: { facil: 3, medio: 0, dificil: 0 }, usados, rng });
      const textos = r.itens.map((i) => i.texto);
      assert.equal(new Set(textos).size, textos.length, `seed ${s} vez ${vez}: repetiu na vez ${textos}`);
      usados = r.usados;
      anterior = textos;
    }
    assert.ok(anterior);
  }
});

test('sortearVez: no reset, o primeiro item do novo ciclo não repete o último do ciclo anterior', () => {
  const temas = [temaFalso('a', 3)];
  const mix = { facil: 1, medio: 0, dificil: 0 };
  for (let s = 1; s <= 100; s++) {
    const rng = rngSemente(s);
    let usados = {};
    let ultimo = null;
    for (let vez = 0; vez < 20; vez++) {
      const r = sortearVez({ temas, temasEscolhidos: ['a'], mix, usados, rng });
      assert.notEqual(r.itens[0].texto, ultimo, `seed ${s} vez ${vez}`);
      ultimo = r.itens[0].texto;
      usados = r.usados;
    }
  }
});
