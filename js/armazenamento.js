const CHAVE_PARTIDA = 'mimica:partida';
const CHAVE_CONFIG = 'mimica:config';
// Itens já sorteados, por tema+dificuldade: vive entre partidas para a revanche não repetir item.
const CHAVE_USADOS = 'mimica:usados';

export function criarArmazenamento(storage) {
  const ler = (chave) => {
    try {
      const texto = storage?.getItem(chave);
      return texto ? JSON.parse(texto) : null;
    } catch {
      return null;
    }
  };
  const gravar = (chave, valor) => {
    try {
      if (valor == null) storage?.removeItem(chave);
      else storage?.setItem(chave, JSON.stringify(valor));
    } catch {
      // sem storage o jogo segue, só não retoma
    }
  };
  return {
    carregarPartida: () => ler(CHAVE_PARTIDA),
    salvarPartida: (estado) => gravar(CHAVE_PARTIDA, estado),
    limparPartida: () => gravar(CHAVE_PARTIDA, null),
    carregarConfig: () => ler(CHAVE_CONFIG),
    salvarConfig: (config) => gravar(CHAVE_CONFIG, config),
    carregarUsados: () => ler(CHAVE_USADOS),
    salvarUsados: (usados) => gravar(CHAVE_USADOS, usados),
  };
}
