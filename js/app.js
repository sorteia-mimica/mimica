import { criarArmazenamento } from './armazenamento.js';
import { configUtilizavel } from './config.js';
import {
  criarPartida, vezAtual, sortear, registrarVez, terminou, placar, nomeDoTime, retomar, partidaCompativel,
} from './jogo.js';
import { manterTelaAcesa, liberarTela, desbloquearAudio } from './efeitos.js';
import { telaInicio } from './telas/inicio.js';
import { telaComoJogar } from './telas/comoJogar.js';
import { telaErro } from './telas/erro.js';
import { telaConfiguracao } from './telas/configuracao.js';
import { telaVez } from './telas/vez.js';
import { telaLeitura } from './telas/leitura.js';
import { telaMimica } from './telas/mimica.js';
import { telaConferencia } from './telas/conferencia.js';
import { telaResultado } from './telas/resultado.js';
import { telaFinal } from './telas/final.js';

// Ignora toques logo após trocar de tela: um toque duplo não pode cair no botão da tela seguinte.
const BLOQUEIO_TOQUE_MS = 400;

const raiz = document.getElementById('app');
let storage = null;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}
const armazenamento = criarArmazenamento(storage);

let temas = [];
let estado = null;
let limparTela = null;

function mostrar(tela, props) {
  limparTela?.();
  const el = document.createElement('section');
  el.className = 'tela';
  el.style.pointerEvents = 'none';
  setTimeout(() => { el.style.pointerEvents = ''; }, BLOQUEIO_TOQUE_MS);
  raiz.replaceChildren(el);
  limparTela = tela(el, props) ?? null;
  window.scrollTo(0, 0);
  // Leitor de tela: anuncia a tela nova pelo título (sem live region no <main>, que lia tudo a cada re-render).
  const titulo = el.querySelector('h1, h2');
  if (titulo) {
    titulo.tabIndex = -1;
    titulo.focus({ preventScroll: true });
  }
}

function atualizar(novo) {
  estado = novo;
  armazenamento.salvarPartida(estado);
}

function partidaSalva() {
  try {
    const salvo = armazenamento.carregarPartida();
    if (partidaCompativel(salvo, temas)) return salvo;
  } catch {
    // estado ilegível: cai no descarte abaixo
  }
  armazenamento.limparPartida();
  return null;
}

function configSalva() {
  try {
    const salva = armazenamento.carregarConfig();
    return configUtilizavel(salva) ? salva : null;
  } catch {
    return null;
  }
}

function irInicio() {
  liberarTela();
  mostrar(telaInicio, {
    temPartidaSalva: Boolean(partidaSalva()),
    aoJogar: () => {
      if (partidaSalva() && !window.confirm('Começar outra? A partida salva vai pro beleléu.')) return;
      irConfiguracao();
    },
    aoComoJogar: () => mostrar(telaComoJogar, { aoVoltar: irInicio }),
    aoContinuar: () => {
      const salvo = partidaSalva();
      if (!salvo) return irInicio();
      atualizar(retomar(salvo));
      irVez();
    },
  });
}

function irConfiguracao() {
  mostrar(telaConfiguracao, {
    temas,
    configSalva: configSalva(),
    aoVoltar: irInicio,
    aoComecar: (config) => {
      armazenamento.salvarConfig(config);
      atualizar(criarPartida(config));
      irVez();
    },
  });
}

function irVez() {
  if (terminou(estado)) return irFinal();
  mostrar(telaVez, {
    vez: vezAtual(estado),
    modo: estado.config.modo,
    totalVoltas: estado.config.voltas,
    placar: placar(estado),
    aoSair: irInicio,
    aoSortear: () => {
      desbloquearAudio();
      manterTelaAcesa();
      atualizar(sortear(estado, temas));
      irLeitura();
    },
  });
}

function irLeitura() {
  mostrar(telaLeitura, { itens: estado.itensDaVez, segundos: estado.config.tempoLeitura, aoFim: irMimica });
}

function irMimica() {
  mostrar(telaMimica, {
    itens: estado.itensDaVez,
    segundos: estado.config.tempoMimica,
    aoTerminar: (marcados) => {
      liberarTela();
      if (estado.config.modo === 'duplas') {
        registrar(marcados.map((acertou) => ({ acertou, acertouTime: null })));
      } else {
        irConferencia(marcados);
      }
    },
  });
}

function irConferencia(marcados) {
  const vez = vezAtual(estado);
  const jogadores = estado.config.times
    .map((time, i) => ({ time: i, nome: nomeDoTime(time) }))
    .filter((j) => j.time !== vez.time);
  mostrar(telaConferencia, {
    itens: estado.itensDaVez,
    marcados,
    jogadores,
    aoConfirmar: registrar,
  });
}

function registrar(resultados) {
  atualizar(registrarVez(estado, resultados));
  irResultado();
}

function irResultado() {
  mostrar(telaResultado, {
    registro: estado.historico.at(-1),
    placar: placar(estado),
    ultimaVez: terminou(estado),
    nomeQuemAcertou: (time) => nomeDoTime(estado.config.times[time]),
    aoProximo: irVez,
  });
}

function irFinal() {
  armazenamento.limparPartida();
  mostrar(telaFinal, {
    placar: placar(estado),
    aoInicio: irInicio,
    aoJogarDeNovo: () => {
      atualizar(criarPartida(estado.config));
      irVez();
    },
  });
}

async function iniciar() {
  raiz.innerHTML = '<p class="muted centro">Carregando…</p>';
  try {
    const resposta = await fetch('data/temas.json');
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    temas = await resposta.json();
  } catch {
    mostrar(telaErro, { mensagem: 'Não foi possível carregar os temas.', aoTentar: iniciar });
    return;
  }
  irInicio();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

iniciar();
