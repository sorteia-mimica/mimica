export const DIFICULDADES = ['facil', 'medio', 'dificil'];

export function embaralhar(lista, rng = Math.random) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function montarDificuldades(mix, rng = Math.random) {
  const lista = DIFICULDADES.flatMap((d) => Array(mix[d] ?? 0).fill(d));
  return embaralhar(lista, rng);
}

// Ciclos completos embaralhados: com temas suficientes não repete;
// com poucos, cada tema aparece no máximo 1 vez a mais que os outros.
export function escolherTemas(temasEscolhidos, quantidade, rng = Math.random) {
  const resultado = [];
  while (resultado.length < quantidade) {
    resultado.push(...embaralhar(temasEscolhidos, rng));
  }
  return resultado.slice(0, quantidade);
}

export function sortearVez({ temas, temasEscolhidos, mix, usados = {}, rng = Math.random }) {
  const dificuldades = montarDificuldades(mix, rng);
  const ids = escolherTemas(temasEscolhidos, dificuldades.length, rng);
  const novosUsados = { ...usados };
  const sorteadosNaVez = {};

  const itens = dificuldades.map((dificuldade, i) => {
    const tema = temas.find((t) => t.id === ids[i]);
    const chave = `${tema.id}:${dificuldade}`;
    const lista = tema.itens[dificuldade];
    let jaUsados = novosUsados[chave] ?? [];
    const daVez = sorteadosNaVez[chave] ?? [];
    let disponiveis = lista.filter((texto) => !jaUsados.includes(texto) && !daVez.includes(texto));
    if (disponiveis.length === 0) {
      // Ciclo esgotado: recomeça, mas sem repetir o que já saiu nesta vez nem o último do ciclo anterior
      // (se a lista for pequena demais, relaxa primeiro o "último" e por fim a própria vez).
      const ultimo = jaUsados.at(-1);
      const sem = (...proibidos) => lista.filter((texto) => !proibidos.flat().includes(texto));
      jaUsados = [];
      disponiveis = [sem(daVez, ultimo), sem(daVez), lista].find((l) => l.length > 0);
    }
    const texto = disponiveis[Math.floor(rng() * disponiveis.length)];
    sorteadosNaVez[chave] = [...daVez, texto];
    novosUsados[chave] = [...jaUsados, texto];
    return { temaId: tema.id, temaNome: tema.nome, emoji: tema.emoji, dificuldade, texto };
  });

  itens.sort((a, b) => DIFICULDADES.indexOf(a.dificuldade) - DIFICULDADES.indexOf(b.dificuldade));
  return { itens, usados: novosUsados };
}
