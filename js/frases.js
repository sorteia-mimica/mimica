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
    'Vitória incontestável. Por enquanto.',
  ],
  empate: [
    'Empate! Ninguém vai dormir tranquilo hoje.',
    'Empatou! Revanche já, ou a amizade não sobrevive.',
    'Deu empate. Foi tudo combinado? 🤔',
  ],
  lanterna: [
    '{nome} ficou com a lanterninha. Ilumina o caminho na próxima! 🔦',
    '{nome}, o importante é participar. Dizem.',
    '{nome} lá no fundo… mas com muito estilo.',
    'Lanterninha pra {nome}. Treina no espelho e volta!',
  ],
});

export function escolher(lista, rng = Math.random) {
  return lista[Math.min(lista.length - 1, Math.floor(rng() * lista.length))];
}

// Frase escapada com o nome escapado e em negrito no lugar de `{nome}`.
export function comNome(frase, nome) {
  return esc(frase).replace('{nome}', () => `<b>${esc(nome)}</b>`);
}
