import { criarArmazenamento } from './armazenamento.js';
import { configUtilizavel } from './config.js';
import {
  criarPartida, vezAtual, sortear, registrarVez, terminou, placar, nomeDoTime, retomar, partidaCompativel,
  usadosValidos, empatadosNoTopo, iniciarDesempate, placarDesempate, resultadoDesempate, progresso, embaralharOrdem,
} from './jogo.js';
import { premios } from './premios.js';
import { voltaSilenciosa } from './voltar.js';
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

// "Voltar" do navegador/Android (botão ou gesto de borda). Modelo simples: fora do Início há sempre UMA
// entrada nossa no topo do histórico; o voltar gasta essa entrada e cada tela decide o que ele faz:
// - leitura, mímica e conferência (vez rodando): fica onde está e repõe a entrada;
// - config, como jogar, vez e resultado: vai ao Início (a partida fica salva);
// - final: igual ao "Voltar ao início";
// - Início (e erro): não guarda entrada nossa. Ao chegar, as nossas (inclusive as velhas de antes de um
//   reload) são devolvidas em silêncio; assim o voltar sai do site, mesmo como 1ª entrada do PWA.
// O modal tem a própria entrada e o ouvinte dele (captura) roda antes deste: voltar com modal aberto só fecha
// o modal, e as voltas silenciosas (js/voltar.js) também param lá e nunca chegam aqui.
const FICAR = Symbol('ficar');
const SAIR = Symbol('sair');
const TELAS_DA_VEZ = [telaLeitura, telaMimica, telaConferencia];
const MAX_ENTRADAS_VELHAS = 5;
let entradaExtra = false;
let soltando = false; // devolvendo entradas: empilhar agora cairia por baixo da volta
let aoVoltarNavegador = SAIR;

// Entradas do jogo: a de agora, a do modal e a da versão anterior ({ vez: true }).
const entradaNossa = (estado) => Boolean(estado?.mimica || estado?.modal || estado?.vez);

function segurarVoltar() {
  if (entradaExtra || soltando) return; // soltando: soltarVoltar() empilha quando terminar
  history.pushState({ mimica: true }, '');
  entradaExtra = true;
}

async function soltarVoltar() {
  if (soltando) return;
  soltando = true;
  for (let i = 0; i < MAX_ENTRADAS_VELHAS && aoVoltarNavegador === SAIR
    && (entradaExtra || entradaNossa(history.state)); i++) {
    entradaExtra = false;
    await voltaSilenciosa.voltar();
  }
  soltando = false;
  if (aoVoltarNavegador !== SAIR) segurarVoltar(); // saiu do Início enquanto soltava
}

window.addEventListener('popstate', () => {
  entradaExtra = false; // o voltar gastou a nossa entrada (ou uma velha, de antes de recarregar)
  if (aoVoltarNavegador === FICAR) segurarVoltar();
  else if (aoVoltarNavegador === SAIR) soltarVoltar(); // ainda sobrou entrada velha: devolve
  else aoVoltarNavegador();
});

// `voltar`: o que o voltar do navegador faz nesta tela (padrão: ir ao Início; ver o modelo acima).
function mostrar(tela, props, { voltar } = {}) {
  limparTela?.();
  if (TELAS_DA_VEZ.includes(tela)) aoVoltarNavegador = FICAR;
  else if (tela === telaInicio || tela === telaErro) aoVoltarNavegador = SAIR;
  else aoVoltarNavegador = voltar ?? irInicio;
  if (aoVoltarNavegador === SAIR) soltarVoltar();
  else segurarVoltar();
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
    aoJogar: irConfiguracao, // a tela já confirmou (modal) se havia partida salva
    aoComoJogar: () => mostrar(telaComoJogar, { aoVoltar: irInicio }),
    aoContinuar: () => {
      const salvo = partidaSalva();
      if (!salvo) return irInicio();
      try {
        atualizar(retomar(salvo));
        irVez();
      } catch {
        // Save que passou na validação mas não roda: descarta em vez de deixar o botão sem resposta.
        armazenamento.limparPartida();
        irInicio();
      }
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
    progresso: progresso(estado),
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
}

function irLeitura() {
  mostrar(telaLeitura, {
    itens: estado.itensDaVez,
    segundos: estado.config.tempoLeitura,
    quemFaz: vezAtual(estado).quemFaz,
    aoFim: irMimica,
  });
}

function irMimica() {
  mostrar(telaMimica, {
    itens: estado.itensDaVez,
    segundos: estado.config.tempoMimica,
    esconderItens: estado.config.esconderItens ?? true, // partida salva antes da opção: padrão
    aoTerminar: (marcados) => {
      liberarTela();
      // No desempate só quem faz pontua: no Individual não tem "quem acertou" para conferir.
      if (estado.config.modo === 'duplas' || vezAtual(estado).desempate) {
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

// Prêmios saem do histórico: se algo nele surpreender, o final aparece sem prêmios (nunca trava).
function premiosSeguros() {
  try {
    return premios(estado);
  } catch {
    return [];
  }
}

function irFinal() {
  const podeDesempatar = !estado.desempate && empatadosNoTopo(estado).length > 1;
  // Com a oferta de desempate na tela, a partida fica salva (recarregar não perde a oferta) até a escolha.
  if (!podeDesempatar) armazenamento.limparPartida();
  const irInicioDoFinal = () => {
    armazenamento.limparPartida();
    irInicio();
  };
  mostrar(telaFinal, {
    placar: placar(estado),
    plural: estado.config.modo === 'duplas',
    premios: premiosSeguros(),
    desempate: resultadoDesempate(estado),
    podeDesempatar,
    aoDesempate: () => {
      atualizar(iniciarDesempate(estado));
      irVez();
    },
    aoFicaEmpatado: () => armazenamento.limparPartida(),
    aoInicio: irInicioDoFinal,
    aoJogarDeNovo: () => {
      // Revanche com outra ordem: quem abriu (ou fechou) a última não repete a vantagem.
      atualizar(criarPartida(embaralharOrdem(estado.config), estado.usados));
      irVez();
    },
  }, { voltar: irInicioDoFinal });
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
