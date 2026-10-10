import { DIFICULDADES } from './sorteio.js';

export const PADRAO = Object.freeze({
  voltas: 3,
  tempoLeitura: 10,
  tempoMimica: 90,
  mix: Object.freeze({ facil: 1, medio: 1, dificil: 1 }),
  pontos: Object.freeze({ facil: 1, medio: 2, dificil: 4 }),
});

const CAMPOS_EXTRAS = [
  'voltas', 'tempoLeitura', 'tempoMimica',
  'mix.facil', 'mix.medio', 'mix.dificil',
  'pontos.facil', 'pontos.medio', 'pontos.dificil',
];

export const lerCaminho = (obj, caminho) => caminho.split('.').reduce((o, k) => o?.[k], obj);

export function escreverCaminho(obj, caminho, valor) {
  const chaves = caminho.split('.');
  const ultima = chaves.pop();
  chaves.reduce((o, k) => o[k], obj)[ultima] = valor;
}

const fora = (v, min, max) => !Number.isInteger(v) || v < min || v > max;

export function validarConfig(config) {
  const erros = [];
  const duplas = config.modo === 'duplas';
  const times = Array.isArray(config.times) ? config.times : [];
  if (config.modo !== 'duplas' && config.modo !== 'individual') erros.push('Escolhe o modo: duplas ou cada um por si?');
  if (times.length < 2) erros.push(duplas ? 'Precisa de pelo menos 2 duplas — sem rival não tem graça.' : 'Precisa de pelo menos 2 jogadores — sozinho é só ensaio.');

  const tamanho = duplas ? 2 : 1;
  const nomes = times.flatMap((t) => t.membros ?? []).map((n) => String(n).trim());
  const incompleto = times.some((t) => (t.membros ?? []).length !== tamanho);
  if (incompleto || nomes.some((n) => n === '')) erros.push('Faltou nome aí — ninguém joga anônimo 🕵️');
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
    if (total < 1 || total > 6) erros.push('Itens por vez: de 1 a 6 — sem item não tem mímica.');
  }
  const pontos = config.pontos ?? {};
  if (DIFICULDADES.some((d) => fora(pontos[d], 1, 5))) erros.push('Pontos por dificuldade: de 1 a 5.');
  return erros;
}

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

// A config salva vem do localStorage: só serve se estiver bem formada e passar na validação (nunca lança).
export function configUtilizavel(config) {
  try {
    return Boolean(
      config
      && typeof config === 'object'
      && Array.isArray(config.times)
      && config.times.every((t) => t && typeof t === 'object' && Array.isArray(t.membros))
      && Array.isArray(config.temas)
      && config.mix && typeof config.mix === 'object'
      && config.pontos && typeof config.pontos === 'object'
      && validarConfig(config).length === 0,
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
  };
  return {
    modo: config.modo,
    times: config.times.map((t) => ({ membros: [...t.membros] })),
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
  while (times.length < 2) times.push({ membros: Array(tamanho).fill('') });
  return { ...form, modo, times };
}
