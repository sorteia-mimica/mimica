import { esc } from './dom.js';

// Frases sorteadas para o jogo não repetir a mesma piada toda vez.
// `{nome}` é trocado pelo nome (escapado) em comNome().
export const FRASES = Object.freeze({
  subtitulo: [
    'Sorteia, encena e torce pra galera entender.',
    'O jogo onde falar é crime e apontar é arte.',
    'Mímica sem briga pelo papelzinho.',
    'Prepare os braços: a boca fica de folga.',
  ],
  vez: [
    'Passa o celular pra {nome}. O resto: olho no teto! 👀',
    'Celular na mão de {nome}. Quem espiar paga o mico 🙈',
    '{nome}, chegou sua hora de brilhar (em silêncio).',
    'Todo mundo de olho fechado, só {nome} pode ver. Confiamos em vocês… mais ou menos.',
  ],
  leitura: [
    'Decora rapidinho! Só você pode ver 🤫',
    'Lê, guarda na cabeça e faz cara de paisagem.',
    'Memoriza! Ninguém mais pode olhar.',
    'Grava bem: depois não tem cola!',
  ],
  mimica: [
    'Valendo! Sem mímica de “fala com a boca”, hein.',
    'Valendo! Gesticula que é sucesso.',
    'Boca fechada, braços abertos!',
    'Solta a criatividade (e não o verbo).',
  ],
  tempoEsgotado: [
    'Acabou o tempo! Marca o que acertaram e bora ver o placar.',
    'O relógio não perdoa. Marca os acertos e segue o baile.',
    'Fim! Quem acertou no último segundo também vale — marca aí.',
  ],
  // Faixa de 1,2 s quando marcam todos os ✓ com o relógio rodando.
  gabaritoNaHora: [
    'Nem precisou do relógio!',
    'Tudo certo antes do apito!',
    'Leitura de mente nível máximo.',
  ],
  zero: [
    'Zero pontos. A mímica foi de arte abstrata 🎨',
    'Nada? Nem a galera entendeu, nem a gente.',
    'Zerou! Mas a performance foi corajosa.',
    'Faltou só… tudo. Próxima vai!',
  ],
  alguns: [
    'Mandou bem! Dava pra ser melhor, mas mandou bem.',
    'Pontinho na conta! A plateia agradece.',
    'Nada mal! Nem tudo saiu, mas o show foi bom.',
    'Uns acertos, uns micos. Faz parte!',
  ],
  gabaritou: [
    'Gabaritou! Isso aí é dom 🔥',
    'Tudo certo! Pode pedir cachê.',
    'Performance de novela das nove! 👏',
    'Acertaram tudo. Telepatia confirmada.',
  ],
  vitoria: [
    'Os reis da mímica! Pode ir se gabar.',
    'Leva o troféu e o direito de zoar até o próximo jogo.',
    'Vitória sem dizer uma palavra. Literalmente.',
    'Ganhou com sobra e sem abrir a boca.',
  ],
  // Margem pequena (tipoDeVitoria → 'apertada'): nada de "incontestável".
  vitoriaApertada: [
    'Na raça! Ganhou no último suspiro 😮‍💨',
    'Por um triz! O placar suou frio.',
    'Vitória no fotochart. Revanche obrigatória!',
    'Ganhou por um fio de bigode.',
  ],
  // Lavada (tipoDeVitoria → 'folgada').
  vitoriaFolgada: [
    'Vitória incontestável. Por enquanto.',
    'Passeio no parque! Ninguém chegou nem perto.',
    'Atropelou geral. Alguém chama o resgate? 🚑',
  ],
  empate: [
    'Empate! Ninguém vai dormir tranquilo hoje.',
    'Empatou! Revanche já, ou a amizade não sobrevive.',
    'Deu empate. Foi tudo combinado? 🤔',
  ],
  desempate: [
    'Ganhou no detalhe! Um item difícil e o troféu é seu ⚡',
    'Nervos de aço no desempate. Respeita!',
    'Decidiu no pênalti da mímica. Que frieza!',
  ],
  empateEterno: [
    'Empatou até no desempate. Isso é destino: dividam o troféu 🤝',
    'Nem o desempate separou. Casem logo.',
    'Empate duplo! A taça vai ter que ser compartilhada.',
  ],
  // `{ficou}` vira "ficou"/"ficaram" (dupla) em fraseLanterna(); o resto das frases não tem verbo com número.
  lanterna: [
    '{nome} {ficou} com a lanterninha. Na próxima, ela ilumina o caminho! 🔦',
    '{nome}: o importante é participar. Dizem.',
    '{nome} lá no fundo… mas com muito estilo.',
    'Lanterninha pra {nome}. Na revanche tem volta!',
  ],
  // Último por 1 ou 2 pontos: "lá no fundo" seria injusto.
  lanternaPerto: [
    '{nome} {ficou} em último por um triz. Na revanche vira!',
    'Lanterninha por detalhe pra {nome}. Quase, hein!',
    '{nome} {ficou} a um sopro do pelotão. Dá pra virar!',
  ],
});

export function escolher(lista, rng = Math.random) {
  return lista[Math.min(lista.length - 1, Math.floor(rng() * lista.length))];
}

// Frase escapada com o nome escapado e em negrito no lugar de `{nome}`.
export function comNome(frase, nome) {
  return esc(frase).replace('{nome}', () => `<b>${esc(nome)}</b>`);
}

// Margem entre 1º e 2º no placar final: 'apertada' (até 2 pontos, ou 5% do líder), 'folgada'
// (6+ pontos e pelo menos 1/4 dos pontos do líder) ou 'normal'.
export function tipoDeVitoria(placar) {
  const [primeiro, segundo] = placar;
  const margem = primeiro.pontos - (segundo?.pontos ?? 0);
  if (margem <= Math.max(2, Math.round(primeiro.pontos * 0.05))) return 'apertada';
  if (margem >= 6 && margem >= primeiro.pontos / 4) return 'folgada';
  return 'normal';
}

export const FRASES_VITORIA = Object.freeze({
  apertada: FRASES.vitoriaApertada, normal: FRASES.vitoria, folgada: FRASES.vitoriaFolgada,
});

// Frase da lanterninha (com `{nome}` para comNome), ou null se não há um único último colocado.
// `plural`: o último é uma dupla ("ficaram"). Perdeu por 1–2 pontos do de cima → frase de "quase".
export function fraseLanterna(placar, { plural = false, rng = Math.random } = {}) {
  const ultimo = placar.at(-1);
  if (!ultimo || ultimo.posicao === 1 || placar.filter((l) => l.posicao === ultimo.posicao).length > 1) return null;
  const acima = placar.at(-2);
  const lista = acima.pontos - ultimo.pontos <= 2 ? FRASES.lanternaPerto : FRASES.lanterna;
  return escolher(lista, rng).replaceAll('{ficou}', plural ? 'ficaram' : 'ficou');
}
