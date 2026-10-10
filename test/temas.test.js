import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const temas = JSON.parse(readFileSync(new URL('../data/temas.json', import.meta.url), 'utf8'));
const porId = Object.fromEntries(temas.map((t) => [t.id, t]));
const contem = (id, dificuldade, ...textos) => {
  for (const texto of textos) assert.ok(porId[id].itens[dificuldade].includes(texto), `${id}/${dificuldade} sem "${texto}"`);
};

test('sete temas na ordem certa', () => {
  assert.deepEqual(temas.map((t) => t.id), ['filmes-series', 'profissao', 'animal', 'esportes', 'futebol', 'dia-a-dia', 'famosos']);
});

test('cada tema: nome, emoji e exatamente 50 itens por dificuldade sem repetição', () => {
  for (const t of temas) {
    assert.ok(t.nome.trim() && t.emoji.trim(), t.id);
    const todos = [];
    for (const d of ['facil', 'medio', 'dificil']) {
      assert.equal(t.itens[d].length, 50, `${t.id}/${d} tem ${t.itens[d].length}`);
      for (const texto of t.itens[d]) {
        assert.equal(typeof texto, 'string');
        assert.equal(texto, texto.trim());
        assert.ok(texto.length > 0);
      }
      todos.push(...t.itens[d]);
    }
    const norm = todos.map((x) => x.toLocaleLowerCase('pt-BR'));
    assert.equal(new Set(norm).size, norm.length, `${t.id} tem item repetido`);
  }
});

test('futebol: exemplos pedidos e nada óbvio demais', () => {
  contem('futebol', 'facil', 'Marcação');
  contem('futebol', 'medio', 'Caneta', 'Tesoura', 'Pressionar');
  contem('futebol', 'dificil', 'Marcação por zona', 'Finalizar no ângulo', 'Campeonato Brasileiro');
  const todos = Object.values(porId.futebol.itens).flat().map((x) => x.toLowerCase());
  for (const proibido of ['cabecear', 'carrinho', 'chutar']) assert.ok(!todos.includes(proibido), proibido);
});

test('ações do dia a dia: exemplos pedidos', () => {
  contem('dia-a-dia', 'facil', 'Escovar os dentes', 'Lavar louça');
  contem('dia-a-dia', 'medio', 'Perder o ônibus', 'Procurar a chave', 'Pisar em Lego');
  contem('dia-a-dia', 'dificil', 'Montar móvel sem manual');
});

test('famosos: exemplos pedidos', () => {
  contem('famosos', 'facil', 'Neymar', 'Xuxa', 'Silvio Santos');
  contem('famosos', 'medio', 'Anitta', 'Faustão', 'Ayrton Senna');
  contem('famosos', 'dificil', 'Einstein', 'Chaves', 'Gretchen');
});

test('esportes não tem futebol de campo', () => {
  const todos = Object.values(porId.esportes.itens).flat().map((x) => x.toLowerCase());
  assert.ok(todos.every((x) => !x.includes('futebol') || x.includes('americano')));
});

test('nenhum texto repete entre temas', () => {
  const vistos = new Map();
  for (const t of temas) {
    for (const texto of Object.values(t.itens).flat()) {
      const chave = texto.toLocaleLowerCase('pt-BR');
      assert.ok(!vistos.has(chave), `"${texto}" em ${t.id} e ${vistos.get(chave)}`);
      vistos.set(chave, t.id);
    }
  }
});
