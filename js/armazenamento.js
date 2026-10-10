const CHAVE_PARTIDA = 'mimica:partida';
const CHAVE_CONFIG = 'mimica:config';

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
  };
}
