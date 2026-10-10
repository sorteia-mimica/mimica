import { sortearVez } from './sorteio.js';
import { validarConfig } from './config.js';

export const VERSAO_ESTADO = 1;

export function criarPartida(config) {
  return {
    versao: VERSAO_ESTADO,
    config,
    vezIndice: 0,
    pontos: config.times.map(() => 0),
    usados: {},
    itensDaVez: null,
    historico: [],
  };
}

export const nomeDoTime = (time) => time.membros.join(' & ');

const tamanhoDoTime = (config) => (config.modo === 'duplas' ? 2 : 1);
export const vezesPorVolta = (config) => config.times.length * tamanhoDoTime(config);
export const totalDeVezes = (config) => vezesPorVolta(config) * config.voltas;

// Os times jogam em rodízio; dentro do time, quem faz alterna a cada vez dele.
export function vezAtual(estado) {
  const { config, vezIndice } = estado;
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
    mix: estado.config.mix,
    usados: estado.usados,
    rng,
  });
  return { ...estado, usados, itensDaVez: itens };
}

export function registrarVez(estado, resultados) {
  if (!estado.itensDaVez) throw new Error('Nenhum item sorteado nesta vez.');
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

export const terminou = (estado) => estado.vezIndice >= totalDeVezes(estado.config);

export function placar(estado) {
  const linhas = estado.config.times
    .map((time, i) => ({ time: i, nome: nomeDoTime(time), pontos: estado.pontos[i] }))
    .sort((a, b) => b.pontos - a.pontos);
  let posicao = 0;
  return linhas.map((linha, i) => {
    if (i === 0 || linha.pontos < linhas[i - 1].pontos) posicao = i + 1;
    return { ...linha, posicao };
  });
}

// Ao retomar, a vez em andamento recomeça do sorteio (o cronômetro não sobrevive).
export const retomar = (estado) => ({ ...estado, itensDaVez: null });

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
      && Number.isInteger(estado.vezIndice)
      && estado.vezIndice >= 0,
    );
  } catch {
    return false;
  }
}
