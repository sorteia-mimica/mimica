import { criarArmazenamento } from './armazenamento.js';
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
import { telaResultado } from './telas/resultado.js';
import { telaFinal } from './telas/final.js';

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
  raiz.replaceChildren(el);
  limparTela = tela(el, props) ?? null;
  window.scrollTo(0, 0);
}

function atualizar(novo) {
  estado = novo;
  armazenamento.salvarPartida(estado);
}

function partidaSalva() {
  const salvo = armazenamento.carregarPartida();
  return partidaCompativel(salvo, temas) ? salvo : null;
}

function irInicio() {
  liberarTela();
  mostrar(telaInicio, {
    temPartidaSalva: Boolean(partidaSalva()),
    aoJogar: irConfiguracao,
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
    configSalva: armazenamento.carregarConfig(),
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
  const vez = vezAtual(estado);
  const jogadores = estado.config.times
    .map((time, i) => ({ time: i, nome: nomeDoTime(time) }))
    .filter((j) => j.time !== vez.time);
  mostrar(telaMimica, {
    itens: estado.itensDaVez,
    segundos: estado.config.tempoMimica,
    modo: estado.config.modo,
    jogadores,
    aoTerminar: (resultados) => {
      liberarTela();
      atualizar(registrarVez(estado, resultados));
      irResultado();
    },
  });
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
    irInicio();
  } catch {
    mostrar(telaErro, { mensagem: 'Não foi possível carregar os temas.', aoTentar: iniciar });
  }
}

iniciar();
