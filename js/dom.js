export const ROTULO_DIFICULDADE = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (texto) => String(texto).replace(/[&<>"']/g, (c) => ENTIDADES[c]);

// `extra` é HTML confiável montado pela tela; `nota` é texto e é escapado aqui.
export function itemHtml(item, { extra = '', acertou = false, nota = '', animar = true } = {}) {
  const classes = ['item', acertou && 'acertou', animar && 'entrar'].filter(Boolean).join(' ');
  return `
    <div class="${classes}" data-dificuldade="${esc(item.dificuldade)}">
      <div class="item-corpo">
        <div class="meta">${esc(item.emoji)} ${esc(item.temaNome)} · <span class="selo">${ROTULO_DIFICULDADE[item.dificuldade]}</span>${nota ? ` <span class="nota">${esc(nota)}</span>` : ''}</div>
        <div class="texto">${esc(item.texto)}</div>
      </div>
      ${extra}
    </div>`;
}

export function placarHtml(linhas) {
  return `<ol class="placar">${linhas
    .map((l) => `<li><span>${l.posicao}º ${esc(l.nome)}</span><b>${l.pontos}</b></li>`)
    .join('')}</ol>`;
}

// Delegação de clique: <button data-acao="x"> chama acoes.x(botao, evento).
export function ligar(el, acoes) {
  el.addEventListener('click', (ev) => {
    const alvo = ev.target.closest('[data-acao]');
    if (alvo && el.contains(alvo) && !alvo.disabled && acoes[alvo.dataset.acao]) {
      acoes[alvo.dataset.acao](alvo, ev);
    }
  });
}
