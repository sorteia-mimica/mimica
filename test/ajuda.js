// Gerador determinístico (mulberry32) para testes reprodutíveis.
export function rngSemente(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function temaFalso(id, n = 5) {
  const lista = (d) => Array.from({ length: n }, (_, i) => `${id}-${d}-${i}`);
  return {
    id,
    nome: id.toUpperCase(),
    emoji: '⭐',
    itens: { facil: lista('facil'), medio: lista('medio'), dificil: lista('dificil') },
  };
}
