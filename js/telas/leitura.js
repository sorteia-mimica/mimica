import { esc, itemHtml, ligar } from '../dom.js';
import { criarAnunciadorDeSegundos, formatarTempo, iniciarCronometro } from '../tempo.js';
import { vibrar } from '../efeitos.js';
import { ligarSegurar } from '../segurar.js';
import { tocarRevelar, tocarTique, tocarValendo } from '../sons.js';
import { FRASES, escolher } from '../frases.js';

// Tempo segurando o botão para revelar: curto pra quem faz, longo demais para um toque sem querer.
const SEGURAR_MS = 600;
// Mesmo bloqueio do roteador: o dedo que acabou de revelar não aperta "Já decorei" sem querer.
const BLOQUEIO_TOQUE_MS = 400;

// Dois passos: primeiro "Só fulano olha 🙈" (segura pra revelar), depois os itens com a contagem de leitura.
export function telaLeitura(el, { itens, segundos, quemFaz, aoFim }) {
  el.classList.add('leitura');
  let parar = () => {};
  el.innerHTML = `
    <section class="card capa privacidade entrar">
      <div class="emoji" aria-hidden="true">🙈</div>
      <h1>Só ${esc(quemFaz)} olha</h1>
      <p>O resto da galera: olho no teto! Os itens só aparecem quando ${esc(quemFaz)} segurar o botão.</p>
    </section>
    <div class="rodape fixo">
      <button class="btn btn-primario btn-segurar" data-segurar aria-describedby="dica-segurar">
        <span class="segurar-preenche" aria-hidden="true"></span><span class="segurar-rotulo">Segura pra revelar 👀</span>
      </button>
      <p id="dica-segurar" class="muted centro dica-segurar">Mantém o dedo (ou Enter/Espaço) até encher.</p>
    </div>`;
  const desligarSegurar = ligarSegurar(el.querySelector('[data-segurar]'), { ms: SEGURAR_MS, aoCompletar: revelar });

  function revelar() {
    desligarSegurar();
    tocarRevelar();
    vibrar(30);
    el.style.pointerEvents = 'none';
    setTimeout(() => { el.style.pointerEvents = ''; }, BLOQUEIO_TOQUE_MS);
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
  }

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

  return () => {
    desligarSegurar();
    parar();
  };
}
