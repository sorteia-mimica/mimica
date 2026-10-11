import { ROTULO_DIFICULDADE, esc, itemHtml, ligar } from '../dom.js';
import { criarAnunciadorDeSegundos, formatarTempo, iniciarCronometro } from '../tempo.js';
import { piscarTela, vibrar } from '../efeitos.js';
import { confirmar, fecharModal } from '../modal.js';
import {
  ligarBotaoSom, tocarAcerto, tocarBuzina, tocarDesmarcar, tocarGabarito, tocarTique,
} from '../sons.js';
import { FRASES, escolher } from '../frases.js';

const DICA_ESPIAR = 'Segura pra espiar 👀';
// Todos os ✓ com o relógio rodando: festa curtinha e a vez acaba sozinha (ninguém fica caçando o botão).
const GABARITO_MS = 1200;
const TECLAS = ['Enter', ' '];

// Item escondido: só tema + dificuldade + ✓. O texto entra no DOM só enquanto quem faz segura o cartão
// (nem leitor de tela "vaza" o item em voz alta). O ✓ não cita o texto pelo mesmo motivo.
function itemEscondidoHtml(item, i) {
  return `
    <div class="item escondido" data-dificuldade="${esc(item.dificuldade)}">
      <button class="item-corpo espiar" data-espiar="${i}" aria-pressed="false">
        <span class="meta">${esc(item.emoji)} ${esc(item.temaNome)} · <span class="selo">${ROTULO_DIFICULDADE[item.dificuldade]}</span></span>
        <span class="texto" data-texto>${DICA_ESPIAR}</span>
      </button>
      <button class="check" data-acao="marcar" data-item="${i}" aria-pressed="false" aria-label="Acertou o item ${i + 1} (${esc(item.temaNome)}, ${ROTULO_DIFICULDADE[item.dificuldade]})">✓</button>
    </div>`;
}

export function telaMimica(el, { itens, segundos, esconderItens = true, aoTerminar }) {
  const marcados = itens.map(() => false);
  let restante = segundos;
  let acabou = false;
  let encerrado = false;
  let gabaritando = false;
  let pararPiscar = () => {};
  let pararGabarito = () => {};

  el.classList.add('mimica');
  el.innerHTML = `
    <h1 class="sr-only">Mímica rolando</h1>
    <div class="card relogio" data-relogio>
      <button class="btn-tema btn-som-mimica" data-som></button>
      <div class="cronometro" data-tempo role="timer" aria-live="off">${formatarTempo(segundos)}</div>
      <div class="barra" aria-hidden="true"><div data-barra style="transform:translateX(100%)"></div></div>
    </div>
    <p class="muted centro" data-aviso aria-live="polite">${esc(escolher(FRASES.mimica))} ${esconderItens
      ? 'Segura o cartão pra espiar; toca no ✓ quando acertarem.'
      : 'Toca no ✓ quando acertarem.'}</p>
    <div class="lista-itens" data-itens>${itens.map((item, i) => (esconderItens
      ? itemEscondidoHtml(item, i)
      : itemHtml(item, {
        animar: false,
        extra: `<button class="check" data-acao="marcar" data-item="${i}" aria-pressed="false" aria-label="Acertou: ${esc(item.texto)}">✓</button>`,
      }))).join('')}</div>
    <div class="rodape fixo"><button class="btn btn-primario" data-acao="terminar">Encerrar a vez</button></div>`;

  ligarBotaoSom(el.querySelector('[data-som]'));
  const anunciar = criarAnunciadorDeSegundos(10); // tique nos 10 últimos segundos; urgente nos 5 finais
  const lista = el.querySelector('[data-itens]');
  const relogio = el.querySelector('[data-relogio]');
  const tempo = el.querySelector('[data-tempo]');
  const barra = el.querySelector('[data-barra]');
  const aviso = el.querySelector('[data-aviso]');
  const botaoTerminar = el.querySelector('[data-acao="terminar"]');

  // ✓ só troca classe e aria-pressed (sem refazer a lista: não derruba uma espiada nem o foco).
  function pintarMarcado(i) {
    const check = lista.querySelector(`[data-acao="marcar"][data-item="${i}"]`);
    check.setAttribute('aria-pressed', String(marcados[i]));
    check.closest('.item').classList.toggle('acertou', marcados[i]);
  }

  function espiar(botao, ver) {
    const i = Number(botao.dataset.espiar);
    botao.setAttribute('aria-pressed', String(ver));
    botao.closest('.item').classList.toggle('espiando', ver);
    botao.querySelector('[data-texto]').textContent = ver ? itens[i].texto : DICA_ESPIAR;
  }
  const alvoEspiar = (ev) => ev.target.closest?.('[data-espiar]');

  if (esconderItens) {
    // Dedo/mouse: mostra enquanto segura. Teclado: enquanto Enter/Espaço estão apertados.
    // Leitor de tela (clique sem ponteiro, detail 0): alterna mostrar/esconder.
    lista.addEventListener('pointerdown', (ev) => {
      const b = alvoEspiar(ev);
      if (!b || ev.button !== 0) return;
      ev.preventDefault();
      b.setPointerCapture?.(ev.pointerId);
      espiar(b, true);
    });
    for (const tipo of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      lista.addEventListener(tipo, (ev) => {
        const b = alvoEspiar(ev);
        if (b) espiar(b, false);
      });
    }
    lista.addEventListener('contextmenu', (ev) => { if (alvoEspiar(ev)) ev.preventDefault(); });
    lista.addEventListener('keydown', (ev) => {
      const b = alvoEspiar(ev);
      if (!b || !TECLAS.includes(ev.key)) return;
      ev.preventDefault();
      espiar(b, true);
    });
    lista.addEventListener('keyup', (ev) => {
      const b = alvoEspiar(ev);
      if (!b || !TECLAS.includes(ev.key)) return;
      ev.preventDefault(); // Firefox: sem isso o Espaço solto vira clique (detail 0) e a espiada fica aberta
      espiar(b, false);
    });
    lista.addEventListener('focusout', (ev) => {
      const b = alvoEspiar(ev);
      if (b) espiar(b, false);
    });
    lista.addEventListener('click', (ev) => {
      const b = alvoEspiar(ev);
      if (b && ev.detail === 0) espiar(b, b.getAttribute('aria-pressed') !== 'true');
    });
  }

  const parar = iniciarCronometro(segundos, {
    aoTick: (r) => {
      restante = r;
      tempo.textContent = formatarTempo(r);
      barra.style.transform = `translateX(${(r / segundos) * 100}%)`;
      const urgente = r > 0 && r <= 10;
      tempo.classList.toggle('alerta', urgente);
      relogio.classList.toggle('urgente', urgente);
      const s = anunciar(r);
      if (s !== null) tocarTique({ urgente: s <= 5 });
    },
    aoFim: () => {
      acabou = true;
      fecharModal(); // o "Encerrar já?" perdeu o sentido: o tempo decidiu
      tempo.textContent = 'Tempo!';
      tempo.classList.remove('alerta');
      tempo.classList.add('fim');
      relogio.classList.remove('urgente');
      relogio.classList.add('esgotado');
      aviso.textContent = escolher(FRASES.tempoEsgotado);
      botaoTerminar.textContent = 'Ver resultado';
      vibrar([300, 100, 300]);
      tocarBuzina();
      pararPiscar = piscarTela(); // quem está a 2 m também percebe
    },
  });

  // Relógio para na hora; a faixa cobre a tela (sem desfazer: na conferência do Individual ainda dá pra corrigir).
  function gabaritar() {
    gabaritando = true;
    parar();
    const faixa = document.createElement('div');
    faixa.className = 'gabarito';
    faixa.setAttribute('role', 'status');
    faixa.innerHTML = `<p><b>Gabarito!</b> <span aria-hidden="true">🎯</span></p><p class="gabarito-sub">${esc(escolher(FRASES.gabaritoNaHora))}</p>`;
    document.body.append(faixa);
    tocarGabarito();
    vibrar([60, 40, 120]);
    const timer = setTimeout(encerrar, GABARITO_MS);
    pararGabarito = () => {
      clearTimeout(timer);
      faixa.remove();
    };
  }

  function encerrar() {
    if (encerrado) return;
    encerrado = true;
    parar();
    aoTerminar([...marcados]);
  }

  ligar(el, {
    marcar: (b) => {
      if (gabaritando) return;
      const i = Number(b.dataset.item);
      marcados[i] = !marcados[i];
      (marcados[i] ? tocarAcerto : tocarDesmarcar)();
      pintarMarcado(i);
      if (!acabou && marcados.every(Boolean)) gabaritar();
    },
    // Com tempo sobrando, um toque sem querer não pode acabar com a vez: pede confirmação.
    terminar: async () => {
      if (gabaritando) return;
      if (!acabou) {
        const sim = await confirmar({
          titulo: 'Encerrar já?',
          texto: `Ainda sobra ${formatarTempo(restante)}. Os ✓ marcados valem.`,
          sim: 'Encerrar',
          nao: 'Continuar',
        });
        if (!sim) return;
      }
      encerrar();
    },
  });

  return () => {
    parar();
    fecharModal();
    pararPiscar();
    pararGabarito();
  };
}
