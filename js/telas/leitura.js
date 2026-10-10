import { esc, itemHtml, ligar } from '../dom.js';
import { criarAnunciadorDeSegundos, formatarTempo, iniciarCronometro } from '../tempo.js';
import { vibrar } from '../efeitos.js';
import { tocarTique, tocarValendo } from '../sons.js';
import { FRASES, escolher } from '../frases.js';

export function telaLeitura(el, { itens, segundos, aoFim }) {
  el.classList.add('leitura');
  el.innerHTML = `
    <h1 class="sr-only">Hora de decorar</h1>
    <p class="centro"><b>${esc(escolher(FRASES.leitura))}</b></p>
    <div class="card relogio">
      <div class="cronometro" data-tempo role="timer" aria-live="off">${formatarTempo(segundos)}</div>
      <div class="barra" aria-hidden="true"><div data-barra style="transform:translateX(100%)"></div></div>
    </div>
    <div class="lista-itens">${itens.map((item) => itemHtml(item)).join('')}</div>
    <div class="rodape fixo"><button class="btn" data-acao="pular">Já decorei, valendo!</button></div>`;

  const tempo = el.querySelector('[data-tempo]');
  const barra = el.querySelector('[data-barra]');
  const anunciar = criarAnunciadorDeSegundos(3); // tique suave nos 3 últimos segundos
  let encerrado = false;
  let parar = () => {}; // declarado antes do cronômetro: um aoFim síncrono não pode cair na TDZ
  const encerrar = () => {
    if (encerrado) return;
    encerrado = true;
    parar();
    tocarValendo();
    aoFim();
  };
  parar = iniciarCronometro(segundos, {
    aoTick: (r) => {
      tempo.textContent = formatarTempo(r);
      barra.style.transform = `translateX(${(r / segundos) * 100}%)`;
      if (anunciar(r) !== null) tocarTique();
    },
    aoFim: () => {
      vibrar(100);
      encerrar();
    },
  });
  ligar(el, { pular: encerrar });
  return parar;
}
