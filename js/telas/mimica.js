import { esc, itemHtml, ligar } from '../dom.js';
import { formatarTempo, iniciarCronometro } from '../tempo.js';
import { bip, vibrar } from '../efeitos.js';

export function telaMimica(el, { itens, segundos, modo, jogadores, aoTerminar }) {
  const resultados = itens.map(() => ({ acertou: false, acertouTime: null }));
  let escolhendo = null; // índice do item esperando "quem acertou?" (modo individual)

  el.innerHTML = `
    <div class="cronometro" data-tempo>${formatarTempo(segundos)}</div>
    <div class="barra"><div data-barra style="width:100%"></div></div>
    <p class="muted centro" data-aviso>Marque ✓ quando acertarem.</p>
    <div class="lista-itens" data-itens></div>
    <div class="rodape"><button class="btn btn-primario" data-acao="terminar">Terminar</button></div>`;

  const lista = el.querySelector('[data-itens]');
  const tempo = el.querySelector('[data-tempo]');
  const barra = el.querySelector('[data-barra]');
  const aviso = el.querySelector('[data-aviso]');
  const botaoTerminar = el.querySelector('[data-acao="terminar"]');
  const nomeDe = (time) => jogadores.find((j) => j.time === time)?.nome ?? '';

  function renderItens() {
    lista.innerHTML = itens.map((item, i) => {
      const r = resultados[i];
      const escolha = escolhendo === i
        ? `<div class="escolher-quem"><span class="muted">Quem acertou?</span>${jogadores
          .map((j) => `<button class="chip" data-acao="quem" data-item="${i}" data-time="${j.time}">${esc(j.nome)}</button>`)
          .join('')}</div>`
        : '';
      return itemHtml(item, {
        animar: false,
        acertou: r.acertou,
        nota: r.acertouTime !== null ? `· ${nomeDe(r.acertouTime)}` : '',
        extra: `<button class="check" data-acao="marcar" data-item="${i}" aria-pressed="${r.acertou}" aria-label="Acertou">✓</button>${escolha}`,
      });
    }).join('');
  }

  const parar = iniciarCronometro(segundos, {
    aoTick: (r) => {
      tempo.textContent = formatarTempo(r);
      barra.style.width = `${(r / segundos) * 100}%`;
      tempo.classList.toggle('alerta', r > 0 && r <= 10);
    },
    aoFim: () => {
      tempo.textContent = 'Tempo!';
      tempo.classList.remove('alerta');
      aviso.textContent = 'Tempo esgotado! Marque o que acertaram e toque em Ver resultado.';
      botaoTerminar.textContent = 'Ver resultado';
      vibrar([300, 100, 300]);
      bip({ vezes: 3 });
    },
  });

  ligar(el, {
    marcar: (b) => {
      const i = Number(b.dataset.item);
      if (resultados[i].acertou) {
        resultados[i] = { acertou: false, acertouTime: null };
        escolhendo = null;
      } else if (modo === 'individual') {
        escolhendo = escolhendo === i ? null : i;
      } else {
        resultados[i] = { acertou: true, acertouTime: null };
      }
      renderItens();
    },
    quem: (b) => {
      resultados[Number(b.dataset.item)] = { acertou: true, acertouTime: Number(b.dataset.time) };
      escolhendo = null;
      renderItens();
    },
    terminar: () => {
      parar();
      aoTerminar(resultados);
    },
  });

  renderItens();
  return parar;
}
