import { DIFICULDADES } from './sorteio.js';

export const PADRAO = Object.freeze({
  voltas: 3,
  tempoLeitura: 10,
  tempoMimica: 90,
  mix: Object.freeze({ facil: 1, medio: 1, dificil: 1 }),
  pontos: Object.freeze({ facil: 1, medio: 2, dificil: 4 }),
  // Na mímica os itens ficam escondidos (segura o cartão pra espiar): ninguém lê por cima do ombro.
  esconderItens: true,
});

const CAMPOS_EXTRAS = [
  'voltas', 'tempoLeitura', 'tempoMimica',
  'mix.facil', 'mix.medio', 'mix.dificil',
  'pontos.facil', 'pontos.medio', 'pontos.dificil',
  'esconderItens',
];

export const lerCaminho = (obj, caminho) => caminho.split('.').reduce((o, k) => o?.[k], obj);

export function escreverCaminho(obj, caminho, valor) {
  const chaves = caminho.split('.');
  const ultima = chaves.pop();
  chaves.reduce((o, k) => o[k], obj)[ultima] = valor;
}

const fora = (v, min, max) => !Number.isInteger(v) || v < min || v > max;

// Mensagens que a tela de configuração trata à parte (ver errosVisiveis).
export const ERROS = Object.freeze({
  faltouNome: 'Faltou nome aí — ninguém joga anônimo 🕵️',
  // Com 2 no Individual, quem faz e o único que adivinha ganham os mesmos pontos em todo acerto.
  individualMinimo: 'No individual precisa de 3+ — com 2 é empate garantido. Joga em dupla!',
});
const MINIMO_INDIVIDUAL = 3;

export function validarConfig(config) {
  const erros = [];
  const duplas = config.modo === 'duplas';
  const times = Array.isArray(config.times) ? config.times : [];
  if (config.modo !== 'duplas' && config.modo !== 'individual') erros.push('Escolhe o modo: duplas ou cada um por si?');
  if (duplas && times.length < 2) erros.push('Precisa de pelo menos 2 duplas — sem rival não tem graça.');
  if (!duplas && times.length < MINIMO_INDIVIDUAL) erros.push(ERROS.individualMinimo);

  const tamanho = duplas ? 2 : 1;
  // Nome que não é texto (storage adulterado) conta como nome faltando.
  const nomes = times.flatMap((t) => t.membros ?? []).map((n) => (typeof n === 'string' ? n.trim() : ''));
  const incompleto = times.some((t) => (t.membros ?? []).length !== tamanho);
  if (incompleto || nomes.some((n) => n === '')) erros.push(ERROS.faltouNome);
  const normalizados = nomes.filter(Boolean).map((n) => n.toLocaleLowerCase('pt-BR'));
  if (new Set(normalizados).size !== normalizados.length) erros.push('Tem nome repetido. Põe um sobrenome ou apelido pra diferenciar.');

  if (!Array.isArray(config.temas) || config.temas.length === 0) erros.push('Escolhe pelo menos 1 tema pra gente ter o que sortear.');
  if (fora(config.voltas, 1, 10)) erros.push('Voltas: de 1 a 10 (mais que isso ninguém aguenta).');
  if (fora(config.tempoMimica, 30, 300) || config.tempoMimica % 15 !== 0) erros.push('Tempo de mímica: de 30 s a 5 min, de 15 em 15 s.');
  if (fora(config.tempoLeitura, 5, 30)) erros.push('Tempo de leitura: de 5 a 30 s.');

  const mix = config.mix ?? {};
  if (DIFICULDADES.some((d) => fora(mix[d], 0, 3))) {
    erros.push('Itens por dificuldade: de 0 a 3.');
  } else {
    const total = DIFICULDADES.reduce((soma, d) => soma + mix[d], 0);
    if (total < 1) erros.push('Itens por vez: pelo menos 1 — sem item não tem mímica.');
    if (total > 6) erros.push('Itens por vez: no máximo 6 — mais que isso ninguém decora.');
  }
  const pontos = config.pontos ?? {};
  if (DIFICULDADES.some((d) => fora(pontos[d], 1, 5))) erros.push('Pontos por dificuldade: de 1 a 5.');
  // Campo novo: config salva antes dele não tem o campo e vale o padrão.
  if (config.esconderItens !== undefined && typeof config.esconderItens !== 'boolean') erros.push('Itens na mímica: escondidos ou à mostra.');
  return erros;
}

// "Faltou nome" logo de cara (campos ainda em branco) é bronca antes da hora: só aparece depois de tentar começar.
export const errosVisiveis = (erros, tentouComecar) =>
  (tentouComecar ? erros : erros.filter((e) => e !== ERROS.faltouNome));

// `idsTemas`: na primeira partida todos os temas já vêm marcados (o grupo desmarca o que não quiser).
export function formVazio(idsTemas = []) {
  return {
    modo: 'duplas',
    times: [{ membros: ['', ''] }, { membros: ['', ''] }],
    temas: [...idsTemas],
    personalizado: false,
    extras: structuredClone(PADRAO),
  };
}

// Erros de uma config salva antes da regra "Individual com 3+": a do Individual com 2 ainda serve
// (para preencher o form ou continuar a partida); qualquer outro erro não.
export function errosDeConfigSalva(config) {
  const erros = validarConfig(config);
  const antigaComDois = config.modo === 'individual' && config.times.length === 2;
  return antigaComDois ? erros.filter((e) => e !== ERROS.individualMinimo) : erros;
}

// A config salva vem do localStorage: só serve se estiver bem formada e passar na validação (nunca lança).
export function configUtilizavel(config) {
  try {
    return Boolean(
      config
      && typeof config === 'object'
      && Array.isArray(config.times)
      && config.times.every((t) => t && typeof t === 'object' && Array.isArray(t.membros)
        && t.membros.every((n) => typeof n === 'string'))
      && Array.isArray(config.temas)
      && config.mix && typeof config.mix === 'object'
      && config.pontos && typeof config.pontos === 'object'
      && errosDeConfigSalva(config).length === 0,
    );
  } catch {
    return false;
  }
}

export function formDeConfig(config) {
  const extras = {
    voltas: config.voltas,
    tempoLeitura: config.tempoLeitura,
    tempoMimica: config.tempoMimica,
    mix: { ...config.mix },
    pontos: { ...config.pontos },
    esconderItens: config.esconderItens ?? PADRAO.esconderItens,
  };
  const times = config.times.map((t) => ({ membros: [...t.membros] }));
  if (config.modo === 'individual') while (times.length < MINIMO_INDIVIDUAL) times.push({ membros: [''] });
  return {
    modo: config.modo,
    times,
    temas: [...config.temas],
    personalizado: CAMPOS_EXTRAS.some((c) => lerCaminho(extras, c) !== lerCaminho(PADRAO, c)),
    extras,
  };
}

export function montarConfig(form) {
  const base = form.personalizado ? form.extras : PADRAO;
  return {
    modo: form.modo,
    times: form.times.map((t) => ({ membros: t.membros.map((n) => n.trim()) })),
    temas: [...form.temas],
    voltas: base.voltas,
    tempoLeitura: base.tempoLeitura,
    tempoMimica: base.tempoMimica,
    mix: { ...base.mix },
    pontos: { ...base.pontos },
    esconderItens: base.esconderItens,
  };
}

export function trocarModo(form, modo) {
  if (form.modo === modo) return form;
  const tamanho = modo === 'duplas' ? 2 : 1;
  const nomes = form.times.flatMap((t) => t.membros).filter((n) => n.trim() !== '');
  const times = [];
  for (let i = 0; i < nomes.length; i += tamanho) {
    const membros = nomes.slice(i, i + tamanho);
    while (membros.length < tamanho) membros.push('');
    times.push({ membros });
  }
  const minimo = modo === 'duplas' ? 2 : MINIMO_INDIVIDUAL;
  while (times.length < minimo) times.push({ membros: Array(tamanho).fill('') });
  return { ...form, modo, times };
}

// Tempo extra por vez além de leitura + mímica: passar o celular, sortear, conferir, ler o resultado.
const TROCA_SEG = 25;

// Estimativa para a tela de configuração: { vezes, minutos }. Conta os lugares (mesmo com nome em branco).
// Até 15 min arredonda no minuto; acima, de 5 em 5 (mais que isso seria precisão de mentira).
export function estimarDuracao(config) {
  const tamanho = config.modo === 'duplas' ? 2 : 1;
  const vezes = config.times.length * tamanho * config.voltas;
  const minutos = (vezes * (config.tempoLeitura + config.tempoMimica + TROCA_SEG)) / 60;
  return { vezes, minutos: minutos < 15 ? Math.max(1, Math.round(minutos)) : Math.round(minutos / 5) * 5 };
}
