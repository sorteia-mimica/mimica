import { esc, itemHtml, ligar } from '../dom.js';
import { formatarTempo, iniciarCronometro } from '../tempo.js';
import { bip, vibrar } from '../efeitos.js';
import { FRASES, escolher } from '../frases.js';

export function telaMimica(el, { itens, segundos, aoTerminar }) {
  const marcados = itens.map(() => false);

  el.innerHTML = `
    <div class="card relogio">
      <div class="cronometro" data-tempo role="timer" aria-live="off">${formatarTempo(segundos)}</div>
      <div class="barra" aria-hidden="true"><div data-barra style="transform:translateX(100%)"></div></div>
    </div>
    <p class="muted centro" data-aviso aria-live="polite">${esc(escolher(FRASES.mimica))} Toca no ✓ quando acertarem.</p>
    <div class="lista-itens" data-itens></div>
    <div class="rodape fixo"><button class="btn btn-primario" data-acao="terminar">Encerrar a vez</button></div>`;

  const lista = el.querySelector('[data-itens]');
  const tempo = el.querySelector('[data-tempo]');
  const barra = el.querySelector('[data-barra]');
  const aviso = el.querySelector('[data-aviso]');
  const botaoTerminar = el.querySelector('[data-acao="terminar"]');

  function renderItens() {
    const foco = lista.contains(document.activeElement) ? document.activeElement.dataset.item : undefined;
    lista.innerHTML = itens.map((item, i) => itemHtml(item, {
      animar: false,
      acertou: marcados[i],
      extra: `<button class="check" data-acao="marcar" data-item="${i}" aria-pressed="${marcados[i]}" aria-label="Acertou: ${esc(item.texto)}">✓</button>`,
    })).join('');
    if (foco !== undefined) lista.querySelector(`[data-acao="marcar"][data-item="${foco}"]`)?.focus();
  }

  const parar = iniciarCronometro(segundos, {
    aoTick: (r) => {
      tempo.textContent = formatarTempo(r);
      barra.style.transform = `translateX(${(r / segundos) * 100}%)`;
      tempo.classList.toggle('alerta', r > 0 && r <= 10);
    },
    aoFim: () => {
      tempo.textContent = 'Tempo!';
      tempo.classList.remove('alerta');
      tempo.classList.add('fim');
      aviso.textContent = escolher(FRASES.tempoEsgotado);
      botaoTerminar.textContent = 'Ver resultado';
      vibrar([300, 100, 300]);
      bip({ vezes: 3 });
    },
  });

  ligar(el, {
    marcar: (b) => {
      const i = Number(b.dataset.item);
      marcados[i] = !marcados[i];
      renderItens();
    },
    terminar: () => {
      parar();
      aoTerminar([...marcados]);
    },
  });

  renderItens();
  return parar;
}
