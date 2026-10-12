import { esc, itemHtml, ligar } from '../dom.js';
import { criarAnunciadorDeSegundos, formatarTempo, iniciarCronometro } from '../tempo.js';
import { vibrar } from '../efeitos.js';
import { tocarRevelar, tocarTique, tocarValendo } from '../sons.js';
import { FRASES, escolher } from '../frases.js';

// Quem tocou em "Sortear" já está com o celular na mão: os itens aparecem direto, com a contagem de leitura.
export function telaLeitura(el, { itens, segundos, aoFim }) {
  el.classList.add('leitura');
  let parar = () => {};
  tocarRevelar();
  el.innerHTML = `
    <h1 class="sr-only" tabindex="-1">Hora de decorar</h1>
    <p class="centro"><b>${esc(escolher(FRASES.leitura))}</b></p>
    <div class="card relogio">
      <div class="cronometro" data-tempo role="timer" aria-live="off">${formatarTempo(segundos)}</div>
      <div class="barra" aria-hidden="true"><div data-barra style="transform:translateX(100%)"></div></div>
    </div>
    <div class="lista-itens">${itens.map((item) => itemHtml(item)).join('')}</div>
    <div class="rodape fixo"><button class="btn" data-acao="pular">Já decorei, valendo!</button></div>`;
  el.querySelector('h1').focus({ preventScroll: true });
  contar();

  function contar() {
    const tempo = el.querySelector('[data-tempo]');
    const barra = el.querySelector('[data-barra]');
    const anunciar = criarAnunciadorDeSegundos(3); // tique suave nos 3 últimos segundos
    let encerrado = false;
    const encerrar = () => {
      if (encerrado) return;
      encerrado = true;
      parar();
      tocarValendo();
      aoFim();
    };
    // `parar` já existe antes do cronômetro: um aoFim síncrono não cai na TDZ
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
  }

  return () => parar();
}
