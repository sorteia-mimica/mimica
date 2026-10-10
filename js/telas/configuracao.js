import {
  PADRAO, validarConfig, montarConfig, formVazio, formDeConfig, trocarModo, lerCaminho, escreverCaminho,
} from '../config.js';
import { esc, ligar } from '../dom.js';
import { formatarTempo } from '../tempo.js';

const AJUSTES = [
  { caminho: 'voltas', rotulo: 'Voltas', min: 1, max: 10, passo: 1, fmt: String },
  { caminho: 'tempoMimica', rotulo: 'Tempo de mímica', min: 30, max: 300, passo: 15, fmt: formatarTempo },
  { caminho: 'tempoLeitura', rotulo: 'Tempo pra decorar', min: 5, max: 30, passo: 5, fmt: (s) => `${s} s` },
  { caminho: 'mix.facil', rotulo: 'Itens fáceis', min: 0, max: 3, passo: 1, fmt: String },
  { caminho: 'mix.medio', rotulo: 'Itens médios', min: 0, max: 3, passo: 1, fmt: String },
  { caminho: 'mix.dificil', rotulo: 'Itens difíceis', min: 0, max: 3, passo: 1, fmt: String },
  { caminho: 'pontos.facil', rotulo: 'Pontos — fácil', min: 1, max: 5, passo: 1, fmt: String },
  { caminho: 'pontos.medio', rotulo: 'Pontos — médio', min: 1, max: 5, passo: 1, fmt: String },
  { caminho: 'pontos.dificil', rotulo: 'Pontos — difícil', min: 1, max: 5, passo: 1, fmt: String },
];

const RESUMO_PADRAO = `O clássico que nunca falha: ${PADRAO.voltas} voltas · 1 fácil, 1 médio e 1 difícil por vez · `
  + `${PADRAO.tempoLeitura} s pra decorar · ${formatarTempo(PADRAO.tempoMimica)} de mímica · `
  + `pontos ${PADRAO.pontos.facil}/${PADRAO.pontos.medio}/${PADRAO.pontos.dificil}.`;

// Sugestões nos campos de nome, só para dar o tom (não viram nome de ninguém).
const EXEMPLOS = ['Tia Cleide', 'Primo Jorge', 'Dona Neide', 'Seu Zé', 'Bia do 302', 'Juninho', 'Vó Lurdes', 'Tio do pavê'];

const botaoSegmento = (grupo, valor, rotulo, ativo) =>
  `<button data-acao="${grupo}" data-valor="${valor}" aria-pressed="${ativo}">${rotulo}</button>`;

export function telaConfiguracao(el, { temas, configSalva, aoVoltar, aoComecar }) {
  let form = configSalva ? formDeConfig(configSalva) : formVazio();
  form.temas = form.temas.filter((id) => temas.some((t) => t.id === id));

  function timeHtml(time, i) {
    const individual = form.modo === 'individual';
    const campos = time.membros.map((nome, j) => `
      <input class="campo" data-time="${i}" data-membro="${j}" value="${esc(nome)}"
        placeholder="Ex.: ${EXEMPLOS[(i * time.membros.length + j) % EXEMPLOS.length]}" maxlength="20" autocomplete="off"
        aria-label="${individual ? `Nome do jogador ${i + 1}` : `Dupla ${i + 1}, pessoa ${j + 1}`}">`).join('');
    const remover = form.times.length > 2
      ? `<button class="btn btn-pequeno" data-acao="remover" data-time="${i}" aria-label="Remover ${individual ? 'jogador' : 'dupla'} ${i + 1}">✕</button>`
      : '';
    return individual
      ? `<div class="linha">${campos}${remover}</div>`
      : `<div class="dupla"><div class="muted">Dupla ${i + 1}</div><div class="linha">${campos}${remover}</div></div>`;
  }

  const stepperHtml = (a) => `
    <div class="stepper">
      <span>${a.rotulo}</span>
      <div class="linha">
        <button data-acao="menos" data-caminho="${a.caminho}" aria-label="Diminuir ${a.rotulo}">−</button>
        <span class="valor">${a.fmt(lerCaminho(form.extras, a.caminho))}</span>
        <button data-acao="mais" data-caminho="${a.caminho}" aria-label="Aumentar ${a.rotulo}">+</button>
      </div>
    </div>`;

  function render() {
    const individual = form.modo === 'individual';
    el.innerHTML = `
      <div class="linha topo"><button class="btn btn-pequeno" data-acao="voltar">‹ Voltar</button><h1>Nova partida</h1></div>
      <section class="card">
        <h2>Modo</h2>
        <div class="segmentado">
          ${botaoSegmento('modo', 'duplas', 'Duplas', !individual)}${botaoSegmento('modo', 'individual', 'Individual', individual)}
        </div>
        <p class="muted">${individual
          ? 'Cada um por si: um faz, todo mundo chuta. Ponto pra quem fez e pra quem acertou.'
          : 'Um faz, o parceiro adivinha. Na vez seguinte da dupla, troca quem faz.'}</p>
      </section>
      <section class="card">
        <h2>${individual ? 'Jogadores' : 'Duplas'}</h2>
        ${form.times.map(timeHtml).join('')}
        <div class="linha"><button class="btn btn-pequeno" data-acao="adicionar">+ ${individual ? 'Jogador' : 'Dupla'}</button></div>
      </section>
      <section class="card">
        <h2>Temas</h2>
        <p class="muted dica">Toque nos que a galera topa.</p>
        <div class="chips">${temas.map((t) => `
          <button class="chip" data-acao="tema" data-id="${esc(t.id)}" aria-pressed="${form.temas.includes(t.id)}">${esc(t.emoji)} ${esc(t.nome)}</button>`).join('')}
        </div>
      </section>
      <section class="card">
        <h2>Regras</h2>
        <div class="segmentado">
          ${botaoSegmento('regras', 'padrao', 'Padrão', !form.personalizado)}${botaoSegmento('regras', 'personalizado', 'Personalizado', form.personalizado)}
        </div>
        ${form.personalizado ? AJUSTES.map(stepperHtml).join('') : `<p class="muted">${RESUMO_PADRAO}</p>`}
      </section>
      <div class="rodape">
        <ul class="erros" data-erros></ul>
        <button class="btn btn-primario" data-acao="comecar">Começar partida</button>
      </div>`;
    atualizarErros();
  }

  function atualizarErros() {
    const erros = validarConfig(montarConfig(form));
    el.querySelector('[data-erros]').innerHTML = erros.map((e) => `<li>${esc(e)}</li>`).join('');
    el.querySelector('[data-acao="comecar"]').disabled = erros.length > 0;
  }

  function ajustar(caminho, direcao) {
    const a = AJUSTES.find((x) => x.caminho === caminho);
    const novo = Math.min(a.max, Math.max(a.min, lerCaminho(form.extras, caminho) + direcao * a.passo));
    escreverCaminho(form.extras, caminho, novo);
    render();
  }

  el.addEventListener('input', (ev) => {
    const campo = ev.target.closest('[data-membro]');
    if (!campo) return;
    form.times[Number(campo.dataset.time)].membros[Number(campo.dataset.membro)] = campo.value;
    atualizarErros();
  });

  ligar(el, {
    voltar: aoVoltar,
    modo: (b) => {
      form = trocarModo(form, b.dataset.valor);
      render();
    },
    adicionar: () => {
      form.times.push({ membros: Array(form.modo === 'duplas' ? 2 : 1).fill('') });
      render();
      el.querySelector(`[data-time="${form.times.length - 1}"][data-membro="0"]`)?.focus();
    },
    remover: (b) => {
      form.times.splice(Number(b.dataset.time), 1);
      render();
    },
    tema: (b) => {
      const id = b.dataset.id;
      form.temas = form.temas.includes(id) ? form.temas.filter((x) => x !== id) : [...form.temas, id];
      b.setAttribute('aria-pressed', String(form.temas.includes(id)));
      atualizarErros();
    },
    regras: (b) => {
      form.personalizado = b.dataset.valor === 'personalizado';
      render();
    },
    menos: (b) => ajustar(b.dataset.caminho, -1),
    mais: (b) => ajustar(b.dataset.caminho, 1),
    comecar: () => {
      const config = montarConfig(form);
      if (validarConfig(config).length === 0) aoComecar(config);
    },
  });

  render();
}
