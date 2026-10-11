import { esc } from './dom.js';
import { voltaSilenciosa } from './voltar.js';

// Confirmação dentro do jogo (no lugar do window.confirm, que é feio e trava o cronômetro em alguns navegadores).
// confirmar({ titulo, texto, sim, nao }) → Promise<boolean>. Um modal por vez; abrir outro cancela o anterior.
// Acessível: role="dialog" + aria-modal, resto da página `inert`, Tab preso no modal, Esc/voltar cancelam,
// foco começa no "não" (o lado seguro) e volta para quem abriu.

// Mesmo bloqueio de toque das telas: um toque duplo não confirma sem querer.
const BLOQUEIO_TOQUE_MS = 300;

let aberto = null; // { fechar(resposta, porVoltar) }

// Voltar do Android com o modal aberto só fecha o modal. Ouvinte na fase de captura: no window ele roda
// antes dos ouvintes comuns (o "segurar voltar" do app.js), qualquer que seja a ordem dos imports.
// Também engole as voltas do próprio jogo (voltaSilenciosa): nenhuma chega ao roteador como "voltar".
window.addEventListener('popstate', (ev) => {
  if (voltaSilenciosa.engolir()) {
    ev.stopImmediatePropagation();
  } else if (aberto) {
    ev.stopImmediatePropagation();
    aberto.fechar(false, true);
  }
}, { capture: true });

export const modalAberto = () => aberto !== null;

// Fecha o modal aberto (se houver) respondendo "não". Ex.: o tempo acabou com o "Encerrar já?" na tela.
export function fecharModal() {
  aberto?.fechar(false);
}

export function confirmar({ titulo, texto = '', sim = 'Sim', nao = 'Cancelar' }) {
  fecharModal();
  const app = document.getElementById('app');
  const quemAbriu = document.activeElement;

  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal card" role="dialog" aria-modal="true" aria-labelledby="modal-titulo"${texto ? ' aria-describedby="modal-texto"' : ''}>
      <h2 id="modal-titulo" class="modal-titulo">${esc(titulo)}</h2>
      ${texto ? `<p id="modal-texto">${esc(texto)}</p>` : ''}
      <div class="modal-botoes">
        <button class="btn" data-resposta="nao">${esc(nao)}</button>
        <button class="btn btn-primario" data-resposta="sim">${esc(sim)}</button>
      </div>
    </div>`;
  const caixa = fundo.querySelector('.modal');
  fundo.style.pointerEvents = 'none'; // o toque "vaza" para o app, que está inert: não faz nada
  setTimeout(() => { fundo.style.pointerEvents = ''; }, BLOQUEIO_TOQUE_MS);

  // Entrada no histórico só do modal: o "voltar" do celular fecha o modal e não sai da tela.
  history.pushState({ modal: true }, '');
  app?.setAttribute('inert', '');
  document.body.append(fundo);
  fundo.querySelector('[data-resposta="nao"]').focus();

  return new Promise((resolver) => {
    function fechar(resposta, porVoltar = false) {
      if (aberto !== controle) return;
      aberto = null;
      document.removeEventListener('keydown', teclas, true);
      fundo.remove();
      app?.removeAttribute('inert');
      if (quemAbriu?.isConnected) quemAbriu.focus({ preventScroll: true });
      if (porVoltar) {
        resolver(resposta);
      } else {
        // Devolve a entrada do modal e só responde depois: se a resposta trocar de tela (e empilhar a
        // entrada que segura o voltar), o pushState vem depois da volta, não antes.
        voltaSilenciosa.voltar().then(() => resolver(resposta));
      }
    }
    const controle = { fechar };
    aberto = controle;

    function teclas(ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        fechar(false);
      } else if (ev.key === 'Tab') {
        // Prende o Tab entre os botões do modal.
        const focaveis = [...caixa.querySelectorAll('button')];
        const i = focaveis.indexOf(document.activeElement);
        const proximo = ev.shiftKey ? (i <= 0 ? focaveis.length - 1 : i - 1) : (i + 1) % focaveis.length;
        ev.preventDefault();
        focaveis[proximo].focus();
      }
    }
    document.addEventListener('keydown', teclas, true);

    fundo.addEventListener('click', (ev) => {
      const botao = ev.target.closest('[data-resposta]');
      if (botao) fechar(botao.dataset.resposta === 'sim');
      else if (ev.target === fundo) fechar(false); // toque fora = cancelar
    });
  });
}
