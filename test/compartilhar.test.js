import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoDoResultado, compartilharResultado, LINK_DO_JOGO } from '../js/compartilhar.js';

const placar = [
  { time: 1, nome: 'Ana', pontos: 12, posicao: 1 },
  { time: 0, nome: 'Beto', pontos: 8, posicao: 2 },
  { time: 2, nome: 'Caio', pontos: 8, posicao: 2 },
  { time: 3, nome: 'Duda', pontos: 1, posicao: 4 },
];
const premios = [
  { id: 'ouro', emoji: '🥇', titulo: 'Mímica de ouro', quem: 'Ana', detalhe: '+7 pontos numa vez só.' },
  { id: 'cabeludo', emoji: '💀', titulo: 'Item mais cabeludo', quem: '“Marcação por zona”', detalhe: 'Ana fez e Beto matou a charada' },
];

test('texto traz pódio com medalhas, prêmios e o link do jogo', () => {
  const texto = textoDoResultado({ placar, premios, desempate: null });
  assert.match(texto, /Sorteia Mímica/);
  assert.match(texto, /🏆 Vitória de Ana/);
  assert.match(texto, /🥇 Ana — 12 pts/);
  assert.match(texto, /🥈 Beto — 8 pts\n🥈 Caio — 8 pts/);
  assert.match(texto, /4º Duda — 1 pt\n/);
  assert.match(texto, /🥇 Mímica de ouro: Ana/);
  assert.match(texto, /💀 Item mais cabeludo: “Marcação por zona” \(Ana fez e Beto matou a charada\)/);
  assert.ok(texto.trimEnd().endsWith(LINK_DO_JOGO));
  assert.equal(LINK_DO_JOGO, 'https://sorteia-mimica.github.io/mimica/');
});

test('sem prêmios não tem seção de prêmios', () => {
  assert.doesNotMatch(textoDoResultado({ placar, premios: [], desempate: null }), /Prêmios/);
});

test('empate, desempate decidido e vitória dividida', () => {
  const empate = placar.map((l) => (l.nome === 'Beto' ? { ...l, pontos: 12, posicao: 1 } : l));
  assert.match(textoDoResultado({ placar: empate, premios: [], desempate: null }), /🤝 Empate entre Ana e Beto/);
  const decidido = textoDoResultado({ placar: empate, premios: [], desempate: { vencedores: ['Beto'] } });
  assert.match(decidido, /⚡ Vitória de Beto no desempate/);
  const dividido = textoDoResultado({ placar: empate, premios: [], desempate: { vencedores: ['Ana', 'Beto'] } });
  assert.match(dividido, /🤝 Vitória dividida: Ana e Beto/);
});

test('compartilharResultado: segundo toque com o share aberto (InvalidStateError) não cai no "copiar"', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let copiou = false;
  const erro = (name) => Object.assign(new Error(name), { name });
  try {
    for (const nome of ['AbortError', 'InvalidStateError']) {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
          share: async () => { throw erro(nome); },
          clipboard: { writeText: async () => { copiou = true; } },
        },
      });
      assert.equal(await compartilharResultado({ placar, premios, desempate: null }), 'cancelado', nome);
    }
    assert.equal(copiou, false);
  } finally {
    Object.defineProperty(globalThis, 'navigator', original);
  }
});
