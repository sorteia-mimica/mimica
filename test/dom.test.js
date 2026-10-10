import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, itemHtml, placarHtml } from '../js/dom.js';

const MAL = '<img src=x onerror=alert(1)>';

test('esc', () => {
  assert.equal(esc(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(esc(3), '3');
});

test('itemHtml escapa texto, tema e nota', () => {
  const html = itemHtml({ temaId: 'a', temaNome: MAL, emoji: MAL, dificuldade: 'facil', texto: MAL }, { nota: MAL });
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('data-dificuldade="facil"'));
  assert.ok(html.includes('Fácil'));
});

test('itemHtml marca acertou', () => {
  const html = itemHtml({ temaId: 'a', temaNome: 'A', emoji: '⭐', dificuldade: 'medio', texto: 't' }, { acertou: true });
  assert.ok(html.includes('item acertou'));
});

test('placarHtml escapa nomes', () => {
  const html = placarHtml([{ time: 0, nome: MAL, pontos: 3, posicao: 1 }]);
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('1º'));
});
