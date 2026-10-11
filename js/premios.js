import { nomeDoTime } from './jogo.js';

// Prêmios engraçados do placar final, tirados só do histórico (puro: testável e igual em qualquer tela).
// Cada prêmio: { id, emoji, titulo, quem, detalhe } — tudo texto puro; quem exibe escapa.

const MAX_PREMIOS = 4;
// Prêmio dividido por mais gente que isso perde a graça (vira chamada).
const MAX_EMPATADOS = 3;

// "A", "A e B", "A, B e C".
export const juntarNomes = (nomes) => (nomes.length < 2 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`);

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Conta por nome e devolve { nomes, n } de quem tem o maior valor (> 0), na ordem de cadastro.
// null se ninguém pontuou, se empatou gente demais ou se todo mundo levaria (prêmio pra todos não é prêmio).
function campeoes(contagem, todos) {
  const n = Math.max(0, ...contagem.values());
  if (n === 0) return null;
  const nomes = [...contagem].filter(([, v]) => v === n).map(([nome]) => nome)
    .sort((a, b) => todos.indexOf(a) - todos.indexOf(b));
  if (nomes.length > MAX_EMPATADOS || (nomes.length > 1 && nomes.length === todos.length)) return null;
  return { nomes, n };
}

function somar(mapa, nome, valor = 1) {
  mapa.set(nome, (mapa.get(nome) ?? 0) + valor);
}

function mimicaDeOuro(vezes, todos) {
  const melhor = new Map();
  for (const v of vezes) melhor.set(v.quemFaz, Math.max(melhor.get(v.quemFaz) ?? 0, v.ganhos));
  const c = campeoes(melhor, todos);
  return c && {
    id: 'ouro', emoji: '🥇', titulo: 'Mímica de ouro', quem: juntarNomes(c.nomes),
    detalhe: `+${plural(c.n, 'ponto', 'pontos')} numa vez só. Cachê de novela!`,
  };
}

// Só no Individual: quem mais adivinhou mímica dos outros.
function leitorDeMentes(vezes, config, todos) {
  if (config.modo !== 'individual') return null;
  const acertos = new Map();
  for (const v of vezes) {
    for (const i of v.itens) {
      if (i.acertou && i.acertouTime !== null && i.acertouTime !== v.time) somar(acertos, nomeDoTime(config.times[i.acertouTime]));
    }
  }
  const c = campeoes(acertos, todos);
  return c && {
    id: 'leitor', emoji: '🧠', titulo: 'Leitor de mentes', quem: juntarNomes(c.nomes),
    detalhe: `Adivinhou ${plural(c.n, 'item', 'itens')}. Tem algo de sobrenatural aí.`,
  };
}

// O último difícil que alguém acertou (o mais fresco na memória da galera).
function itemCabeludo(vezes, config) {
  for (const v of [...vezes].reverse()) {
    const item = [...v.itens].reverse().find((i) => i.acertou && i.dificuldade === 'dificil');
    if (!item) continue;
    let quemAcertou;
    if (config.modo === 'duplas') quemAcertou = config.times[v.time].membros.find((m) => m !== v.quemFaz);
    else quemAcertou = item.acertouTime !== null ? nomeDoTime(config.times[item.acertouTime]) : 'a galera';
    return {
      id: 'cabeludo', emoji: '💀', titulo: 'Item mais cabeludo', quem: `“${item.texto}”`,
      detalhe: `${v.quemFaz} fez e ${quemAcertou} matou a charada`,
    };
  }
  return null;
}

// Mais vezes zeradas. Se todo mundo que jogou empatou nisso, ninguém leva (não é prêmio, é retrato do grupo).
function travouGeral(vezes, todos) {
  const zeradas = new Map(vezes.map((v) => [v.quemFaz, 0]));
  for (const v of vezes) if (v.ganhos === 0) somar(zeradas, v.quemFaz);
  const c = campeoes(zeradas, todos);
  if (!c || c.nomes.length === zeradas.size) return null;
  return {
    id: 'travou', emoji: '🐢', titulo: 'Travou geral', quem: juntarNomes(c.nomes),
    detalhe: `${plural(c.n, 'vez zerada', 'vezes zeradas')}. A arte é incompreendida.`,
  };
}

// Vez com tudo acertado (com 1 item só por vez não tem graça).
function gabarito(vezes, todos) {
  const gabaritos = new Map();
  for (const v of vezes) {
    if (v.itens.length >= 2 && v.itens.every((i) => i.acertou)) somar(gabaritos, v.quemFaz);
  }
  const c = campeoes(gabaritos, todos);
  return c && {
    id: 'gabarito', emoji: '🎯', titulo: 'Gabarito', quem: juntarNomes(c.nomes),
    detalhe: c.n === 1 ? 'Acertaram tudo numa vez. Telepatia!' : `Gabaritou ${c.n} vezes. Isso é dom!`,
  };
}

export function premios(estado) {
  const vezes = estado.historico.filter((v) => !v.desempate);
  const { config } = estado;
  const todos = config.times.flatMap((t) => t.membros);
  return [
    mimicaDeOuro(vezes, todos),
    leitorDeMentes(vezes, config, todos),
    itemCabeludo(vezes, config),
    travouGeral(vezes, todos),
    gabarito(vezes, todos),
  ].filter(Boolean).slice(0, MAX_PREMIOS);
}
