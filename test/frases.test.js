import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escolher, comNome, FRASES } from '../js/frases.js';

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
