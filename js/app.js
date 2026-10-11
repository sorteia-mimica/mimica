import { criarArmazenamento } from './armazenamento.js';
import { configUtilizavel } from './config.js';
import {
  criarPartida, vezAtual, sortear, registrarVez, terminou, placar, nomeDoTime, retomar, partidaCompativel,
  usadosValidos, empatadosNoTopo, iniciarDesempate, placarDesempate, resultadoDesempate,
} from './jogo.js';
import { premios } from './premios.js';
import { manterTelaAcesa, liberarTela, desbloquearAudio } from './efeitos.js';
import { tocarSorteio } from './sons.js';
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

// Voltar do Android (botão ou gesto de borda) fecharia o PWA e perderia a vez em andamento.
// Enquanto a vez roda (leitura, mímica, conferência), seguramos o "voltar" com uma entrada extra no histórico.
const TELAS_DA_VEZ = [telaLeitura, telaMimica, telaConferencia];
let emVez = false;
let entradaExtra = false;

function segurarVoltar() {
  if (entradaExtra) return;
  history.pushState({ vez: true }, '');
  entradaExtra = true;
}

window.addEventListener('popstate', () => {
  if (emVez) {
    history.pushState({ vez: true }, '');
    entradaExtra = true;
  } else {
    entradaExtra = false; // voltar numa tela comum só gasta a entrada extra; o próximo voltar sai normalmente
  }
});

function mostrar(tela, props) {
  limparTela?.();
  emVez = TELAS_DA_VEZ.includes(tela);
  if (emVez) segurarVoltar();
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
  armazenamento.salvarUsados(estado.usados); // sobrevive ao fim da partida: a próxima não repete item
}

// Durante (e depois de) um desempate, o placar que importa na vez/resultado é o dele.
const placarDaVez = () => (estado.desempate ? placarDesempate(estado) : placar(estado));

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
      atualizar(criarPartida(config, usadosValidos(armazenamento.carregarUsados())));
      irVez();
    },
  });
}

function irVez() {
  if (terminou(estado)) return irFinal();
  const vez = vezAtual(estado);
  mostrar(telaVez, {
    vez,
    modo: estado.config.modo,
    totalVoltas: estado.config.voltas,
    placar: placarDaVez(),
    aoSair: irInicio,
    aoSortear: () => {
      try {
        desbloquearAudio();
        tocarSorteio();
        manterTelaAcesa();
        atualizar(sortear(estado, temas));
        irLeitura();
      } catch {
        liberarTela();
        mostrar(telaErro, { mensagem: 'Deu tilt no sorteio. Tenta de novo?', aoTentar: irVez });
      }
    },
  });
  // A tela da vez não sabe de desempate: troca o selo "Volta X de Y".
  if (vez.desempate) raiz.querySelector('.pilula')?.replaceChildren('⚡ Desempate');
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
    placar: placarDaVez(),
    ultimaVez: terminou(estado),
    nomeQuemAcertou: (time) => nomeDoTime(estado.config.times[time]),
    aoProximo: irVez,
  });
}

function irFinal() {
  armazenamento.limparPartida();
  mostrar(telaFinal, {
    placar: placar(estado),
    premios: premios(estado),
    desempate: resultadoDesempate(estado),
    podeDesempatar: !estado.desempate && empatadosNoTopo(estado).length > 1,
    aoDesempate: () => {
      atualizar(iniciarDesempate(estado));
      irVez();
    },
    aoInicio: irInicio,
    aoJogarDeNovo: () => {
      atualizar(criarPartida(estado.config, estado.usados));
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

// Destrava o áudio no primeiro toque em qualquer lugar (ex.: depois de continuar uma partida salva).
document.addEventListener('pointerdown', desbloquearAudio, { once: true });

iniciar();
