// "Voltar" feito pelo próprio jogo (devolver a entrada do modal, soltar a entrada que segurava o voltar).
// history.back() é assíncrono: quem empilhar uma entrada antes do popstate chegar perde a entrada nova
// (o back anda por cima dela). Por isso voltar() só resolve quando o popstate dessa volta chega, e
// engolir() diz ao ouvinte de popstate que aquele não foi um voltar do usuário.
export function criarVoltaSilenciosa({ history, esperaMaxMs = 1000, agendar = setTimeout }) {
  let pendente = null; // função que encerra a volta em andamento

  return {
    get pendente() { return pendente !== null; },
    voltar() {
      return new Promise((resolver) => {
        const fim = () => {
          if (pendente === fim) pendente = null;
          resolver();
        };
        pendente = fim;
        history.back();
        // Navegador que não andou (sem entrada para trás) não manda popstate: não fica esperando para sempre.
        agendar(fim, esperaMaxMs);
      });
    },
    // Chamar no popstate: true se era a nossa volta (engolir), false se foi o usuário.
    engolir() {
      if (!pendente) return false;
      pendente();
      return true;
    },
  };
}

// Uma só para o jogo todo (modal e roteador): duas voltas ao mesmo tempo nunca se confundem.
export const voltaSilenciosa = typeof window === 'undefined' ? null : criarVoltaSilenciosa({ history: window.history });
