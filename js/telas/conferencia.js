import { esc, itemHtml, ligar } from '../dom.js';

export function telaConferencia(el, { itens, marcados, jogadores, aoConfirmar }) {
  const acertou = [...marcados];
  const quem = itens.map(() => null); // time de quem acertou, por item
  const nomeDe = (time) => jogadores.find((j) => j.time === time)?.nome ?? '';

  el.innerHTML = `
    <header class="topo"><h1>Hora da verdade 🕵️</h1></header>
    <p class="muted">Confere os ✓ e diz quem matou a charada em cada item.</p>
    <div class="lista-itens" data-itens></div>
    <div class="rodape"><button class="btn btn-primario" data-acao="confirmar">Confirmar pontos</button></div>`;

  const lista = el.querySelector('[data-itens]');
  const botao = el.querySelector('[data-acao="confirmar"]');

  function render() {
    lista.innerHTML = itens.map((item, i) => {
      const escolha = acertou[i]
        ? `<div class="escolher-quem"><span class="muted">Quem matou a charada?</span><div class="quem-chips">${jogadores
          .map((j) => `<button class="chip" data-acao="quem" data-item="${i}" data-time="${j.time}" aria-pressed="${quem[i] === j.time}" aria-label="${esc(j.nome)} acertou: ${esc(item.texto)}">${esc(j.nome)}</button>`)
          .join('')}</div></div>`
        : '';
      return itemHtml(item, {
        animar: false,
        acertou: acertou[i],
        nota: acertou[i] && quem[i] !== null ? `· ${nomeDe(quem[i])}` : '',
        extra: `<button class="check" data-acao="marcar" data-item="${i}" aria-pressed="${acertou[i]}" aria-label="Acertou: ${esc(item.texto)}">✓</button>${escolha}`,
      });
    }).join('');
    const pendentes = itens.filter((_, i) => acertou[i] && quem[i] === null).length;
    botao.disabled = pendentes > 0;
    botao.textContent = pendentes > 0
      ? `Falta escolher quem acertou (${pendentes})`
      : 'Confirmar pontos';
  }

  ligar(el, {
    marcar: (b) => {
      const i = Number(b.dataset.item);
      acertou[i] = !acertou[i];
      if (!acertou[i]) quem[i] = null;
      render();
    },
    quem: (b) => {
      const i = Number(b.dataset.item);
      quem[i] = Number(b.dataset.time);
      render();
    },
    confirmar: () => {
      aoConfirmar(itens.map((_, i) => ({ acertou: acertou[i], acertouTime: acertou[i] ? quem[i] : null })));
    },
  });

  render();
}
