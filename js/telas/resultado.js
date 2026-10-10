import { esc, itemHtml, ligar, placarHtml } from '../dom.js';

export function telaResultado(el, { registro, placar, ultimaVez, nomeQuemAcertou, aoProximo }) {
  const nota = (item) => {
    if (!item.acertou) return '· não saiu';
    return item.acertouTime !== null ? `· ${nomeQuemAcertou(item.acertouTime)} acertou` : '· acertou';
  };
  el.innerHTML = `
    <section class="card capa entrar">
      <div class="emoji">${registro.ganhos > 0 ? '🎉' : '😅'}</div>
      <div class="destaque">+${registro.ganhos} ${registro.ganhos === 1 ? 'ponto' : 'pontos'}</div>
      <p class="muted">${esc(registro.quemFaz)} fez a mímica</p>
    </section>
    <div class="lista-itens">${registro.itens.map((item) => itemHtml(item, {
      acertou: item.acertou,
      nota: nota(item),
      extra: `<span class="marca">${item.acertou ? '✓' : '✗'}</span>`,
    })).join('')}</div>
    <section class="card"><h2>Placar</h2>${placarHtml(placar)}</section>
    <div class="rodape">
      <button class="btn btn-primario" data-acao="proximo">${ultimaVez ? 'Ver placar final' : 'Próximo'}</button>
    </div>`;
  ligar(el, { proximo: aoProximo });
}
