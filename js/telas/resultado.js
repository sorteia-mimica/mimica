import { esc, itemHtml, ligar, placarHtml } from '../dom.js';
import { tocarTada, tocarWahWah } from '../sons.js';
import { FRASES, escolher } from '../frases.js';

export function telaResultado(el, { registro, placar, ultimaVez, nomeQuemAcertou, aoProximo }) {
  const nota = (item) => {
    if (!item.acertou) return 'Passou batido';
    return item.acertouTime !== null ? `${nomeQuemAcertou(item.acertouTime)} acertou` : 'Acertou';
  };
  const acertos = registro.itens.filter((i) => i.acertou).length;
  const [emoji, frases] = acertos === 0
    ? ['😅', FRASES.zero]
    : acertos === registro.itens.length ? ['🔥', FRASES.gabaritou] : ['🎉', FRASES.alguns];
  el.innerHTML = `
    <h1 class="sr-only">Resultado da vez</h1>
    <section class="card capa entrar">
      <div class="emoji" aria-hidden="true">${emoji}</div>
      <div class="destaque">+${registro.ganhos} ${registro.ganhos === 1 ? 'ponto' : 'pontos'}</div>
      <p class="titulo-resultado">${esc(escolher(frases))}</p>
      <p class="muted">Mímica de ${esc(registro.quemFaz)} · acertaram ${acertos} de ${registro.itens.length}</p>
    </section>
    <div class="lista-itens">${registro.itens.map((item) => itemHtml(item, {
      acertou: item.acertou,
      nota: nota(item),
      extra: `<span class="marca" aria-hidden="true">${item.acertou ? '✓' : '✗'}</span>`,
    })).join('')}</div>
    <section class="card"><h2>Placar</h2>${placarHtml(placar)}</section>
    <div class="rodape">
      <button class="btn btn-primario" data-acao="proximo">${ultimaVez ? 'Ver placar final 🏆' : 'Próxima vez'}</button>
    </div>`;
  (registro.ganhos > 0 ? tocarTada : tocarWahWah)();
  ligar(el, { proximo: aoProximo });
}
