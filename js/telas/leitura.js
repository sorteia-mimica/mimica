import { itemHtml, ligar } from '../dom.js';
import { formatarTempo, iniciarCronometro } from '../tempo.js';
import { bip, vibrar } from '../efeitos.js';

export function telaLeitura(el, { itens, segundos, aoFim }) {
  el.innerHTML = `
    <p class="muted centro">Memorize! Só você pode ver.</p>
    <div class="cronometro" data-tempo>${formatarTempo(segundos)}</div>
    <div class="barra"><div data-barra style="width:100%"></div></div>
    <div class="lista-itens">${itens.map((item) => itemHtml(item)).join('')}</div>
    <div class="rodape"><button class="btn" data-acao="pular">Já li, começar</button></div>`;

  const tempo = el.querySelector('[data-tempo]');
  const barra = el.querySelector('[data-barra]');
  let encerrado = false;
  const encerrar = () => {
    if (encerrado) return;
    encerrado = true;
    parar();
    aoFim();
  };
  const parar = iniciarCronometro(segundos, {
    aoTick: (r) => {
      tempo.textContent = formatarTempo(r);
      barra.style.width = `${(r / segundos) * 100}%`;
    },
    aoFim: () => {
      bip();
      vibrar(100);
      encerrar();
    },
  });
  ligar(el, { pular: encerrar });
  return parar;
}
