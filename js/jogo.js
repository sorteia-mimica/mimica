import { sortearVez } from './sorteio.js';
import { validarConfig } from './config.js';

export const VERSAO_ESTADO = 1;

const ehObjetoSimples = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const ehListaDeTextos = (l) => Array.isArray(l) && l.every((x) => typeof x === 'string');

// `usados` vem do localStorage (partida anterior): se não estiver bem formado, começa do zero.
export function usadosValidos(usados) {
  if (!ehObjetoSimples(usados) || !Object.values(usados).every(ehListaDeTextos)) return {};
  return Object.fromEntries(Object.entries(usados).map(([chave, lista]) => [chave, [...lista]]));
}

// `usados` semeia o sorteio com os itens das partidas anteriores (não repete item na revanche).
export function criarPartida(config, usados = {}) {
  return {
    versao: VERSAO_ESTADO,
    config,
    vezIndice: 0,
    pontos: config.times.map(() => 0),
    usados: usadosValidos(usados),
    itensDaVez: null,
    historico: [],
  };
}

export const nomeDoTime = (time) => time.membros.join(' & ');

const tamanhoDoTime = (config) => (config.modo === 'duplas' ? 2 : 1);
export const vezesPorVolta = (config) => config.times.length * tamanhoDoTime(config);
export const totalDeVezes = (config) => vezesPorVolta(config) * config.voltas;

// Desempate: cada empatado no 1º lugar faz 1 vez extra com 1 item difícil; os pontos vão para um placar à parte.
// `estado.desempate` = { times: [índices dos empatados], vez: quantos já jogaram, pontos: [um por empatado] }.
const MIX_DESEMPATE = Object.freeze({ facil: 0, medio: 0, dificil: 1 });
const emDesempate = (estado) => Boolean(estado.desempate) && estado.desempate.vez < estado.desempate.times.length;

// Os times jogam em rodízio; dentro do time, quem faz alterna a cada vez dele.
export function vezAtual(estado) {
  const { config, vezIndice } = estado;
  if (emDesempate(estado)) {
    // Na dupla, o primeiro cadastrado faz (as voltas sempre terminam com ele na fila) e o parceiro adivinha.
    const time = estado.desempate.times[estado.desempate.vez];
    const membros = config.times[time].membros;
    return {
      time,
      volta: config.voltas,
      quemFaz: membros[0],
      quemAdivinha: config.modo === 'duplas' ? membros[1] : null,
      desempate: true,
    };
  }
  const time = vezIndice % config.times.length;
  const jogadasDoTime = Math.floor(vezIndice / config.times.length);
  const membros = config.times[time].membros;
  return {
    time,
    volta: Math.floor(vezIndice / vezesPorVolta(config)) + 1,
    quemFaz: membros[jogadasDoTime % membros.length],
    quemAdivinha: config.modo === 'duplas' ? membros[(jogadasDoTime + 1) % membros.length] : null,
  };
}

export function sortear(estado, temas, rng = Math.random) {
  const { itens, usados } = sortearVez({
    temas,
    temasEscolhidos: estado.config.temas,
    mix: emDesempate(estado) ? MIX_DESEMPATE : estado.config.mix,
    usados: estado.usados,
    rng,
  });
  return { ...estado, usados, itensDaVez: itens };
}

// No desempate só quem faz pontua (senão quem adivinha o rival também desempataria) e o placar principal fica intocado.
function registrarDesempate(estado, resultados) {
  const { config, desempate } = estado;
  const vez = vezAtual(estado);
  let ganhos = 0;
  const itens = estado.itensDaVez.map((item, i) => {
    const acertou = Boolean(resultados[i]?.acertou);
    if (acertou) ganhos += config.pontos[item.dificuldade];
    return { ...item, acertou, acertouTime: acertou ? (resultados[i].acertouTime ?? null) : null };
  });
  const pontos = [...desempate.pontos];
  pontos[desempate.vez] += ganhos;
  return {
    ...estado,
    desempate: { ...desempate, vez: desempate.vez + 1, pontos },
    itensDaVez: null,
    historico: [...estado.historico, {
      vezIndice: estado.vezIndice, time: vez.time, quemFaz: vez.quemFaz, ganhos, itens, desempate: true,
    }],
  };
}

export function registrarVez(estado, resultados) {
  if (!estado.itensDaVez) throw new Error('Nenhum item sorteado nesta vez.');
  if (emDesempate(estado)) return registrarDesempate(estado, resultados);
  const { config } = estado;
  const vez = vezAtual(estado);
  const pontos = [...estado.pontos];
  let ganhos = 0;

  const itens = estado.itensDaVez.map((item, i) => {
    const acertou = Boolean(resultados[i]?.acertou);
    const acertouTime = acertou ? (resultados[i].acertouTime ?? null) : null;
    if (acertou) {
      const valor = config.pontos[item.dificuldade];
      pontos[vez.time] += valor;
      ganhos += valor;
      if (config.modo === 'individual' && acertouTime !== null && acertouTime !== vez.time) {
        pontos[acertouTime] += valor;
      }
    }
    return { ...item, acertou, acertouTime };
  });

  return {
    ...estado,
    pontos,
    vezIndice: estado.vezIndice + 1,
    itensDaVez: null,
    historico: [...estado.historico, { vezIndice: estado.vezIndice, time: vez.time, quemFaz: vez.quemFaz, ganhos, itens }],
  };
}

const acabaramAsVoltas = (estado) => estado.vezIndice >= totalDeVezes(estado.config);
export const terminou = (estado) => acabaramAsVoltas(estado) && !emDesempate(estado);

// Linhas { time, nome, pontos } → ranking com posição (empate divide a posição).
function ranquear(linhas, config) {
  const ordenadas = linhas
    .map((l) => ({ ...l, nome: nomeDoTime(config.times[l.time]) }))
    .sort((a, b) => b.pontos - a.pontos);
  let posicao = 0;
  return ordenadas.map((linha, i) => {
    if (i === 0 || linha.pontos < ordenadas[i - 1].pontos) posicao = i + 1;
    return { ...linha, posicao };
  });
}

export const placar = (estado) => ranquear(estado.pontos.map((pontos, time) => ({ time, pontos })), estado.config);

// Índices (em ordem de cadastro) de quem divide o 1º lugar do placar principal.
export function empatadosNoTopo(estado) {
  const maximo = Math.max(...estado.pontos);
  return estado.pontos.flatMap((p, time) => (p === maximo ? [time] : []));
}

// Só faz sentido com a partida terminada, empate no topo e sem desempate anterior; senão devolve o mesmo estado.
export function iniciarDesempate(estado) {
  const times = empatadosNoTopo(estado);
  if (!acabaramAsVoltas(estado) || estado.desempate || times.length < 2) return estado;
  return { ...estado, itensDaVez: null, desempate: { times, vez: 0, pontos: times.map(() => 0) } };
}

// Placar só dos empatados, para a tela da vez durante o desempate.
export const placarDesempate = (estado) =>
  ranquear(estado.desempate.times.map((time, i) => ({ time, pontos: estado.desempate.pontos[i] })), estado.config);

// { placar, vencedores } quando todo mundo do desempate já jogou; senão null. Mais de 1 vencedor = vitória dividida.
export function resultadoDesempate(estado) {
  if (!estado.desempate || emDesempate(estado)) return null;
  const linhas = placarDesempate(estado);
  return { placar: linhas, vencedores: linhas.filter((l) => l.posicao === 1).map((l) => l.time).sort((a, b) => a - b) };
}

// Ao retomar, a vez em andamento recomeça do sorteio (o cronômetro não sobrevive).
export const retomar = (estado) => ({ ...estado, itensDaVez: null });

function desempateValido(desempate, totalTimes) {
  if (desempate == null) return true; // saves de antes do desempate não têm o campo
  const { times, vez, pontos } = desempate;
  return ehObjetoSimples(desempate)
    && Array.isArray(times)
    && times.length >= 2
    && times.every((t) => Number.isInteger(t) && t >= 0 && t < totalTimes)
    && new Set(times).size === times.length
    && Number.isInteger(vez) && vez >= 0 && vez <= times.length
    && Array.isArray(pontos) && pontos.length === times.length
    && pontos.every(Number.isInteger);
}

// O estado vem do localStorage (pode estar corrompido): qualquer surpresa vira "incompatível", nunca exceção.
export function partidaCompativel(estado, temas) {
  try {
    const { config } = estado ?? {};
    return Boolean(
      estado
      && estado.versao === VERSAO_ESTADO
      && config
      && Array.isArray(config.times)
      && config.times.every((t) => t && typeof t === 'object' && Array.isArray(t.membros))
      && validarConfig(config).length === 0
      && config.temas.every((id) => temas.some((t) => t.id === id))
      && Array.isArray(estado.pontos)
      && estado.pontos.length === config.times.length
      && estado.pontos.every(Number.isInteger)
      && Array.isArray(estado.historico)
      && ehObjetoSimples(estado.usados)
      && Object.values(estado.usados).every(ehListaDeTextos)
      && (estado.itensDaVez === null || Array.isArray(estado.itensDaVez))
      && Number.isInteger(estado.vezIndice)
      && estado.vezIndice >= 0
      && desempateValido(estado.desempate, config.times.length),
    );
  } catch {
    return false;
  }
}
