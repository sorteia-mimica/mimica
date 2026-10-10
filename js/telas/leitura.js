import { esc, itemHtml, ligar } from '../dom.js';
import { formatarTempo, iniciarCronometro } from '../tempo.js';
import { bip, vibrar } from '../efeitos.js';
import { FRASES, escolher } from '../frases.js';

export function telaLeitura(el, { itens, segundos, aoFim }) {
  el.classList.add('leitura');
  el.innerHTML = `
    <p class="centro"><b>${esc(escolher(FRASES.leitura))}</b></p>
    <div class="card relogio">
      <div class="cronometro" data-tempo>${formatarTempo(segundos)}</div>
      <div class="barra" aria-hidden="true"><div data-barra style="transform:translateX(100%)"></div></div>
    </div>
    <div class="lista-itens">${itens.map((item) => itemHtml(item)).join('')}</div>
    <div class="rodape"><button class="btn" data-acao="pular">Já decorei, valendo!</button></div>`;

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
      barra.style.transform = `translateX(${(r / segundos) * 100}%)`;
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
