import { esc, ligar, placarHtml } from '../dom.js';
import { confete } from '../efeitos.js';
import { tocarFanfarra } from '../sons.js';
import {
  FRASES, FRASES_VITORIA, comNome, escolher, fraseLanterna, tipoDeVitoria,
} from '../frases.js';
import { juntarNomes } from '../premios.js';
import { compartilharResultado, gerarImagem } from '../compartilhar.js';

const MEDALHAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

// `desempate`: null ou { placar, vencedores } (resultadoDesempate); `podeDesempatar`: empate no topo sem desempate ainda.
// `plural`: cada linha do placar é uma dupla (concordância: "ficaram").
export function telaFinal(el, {
  placar, plural = false, premios, desempate, podeDesempatar, aoDesempate, aoJogarDeNovo, aoInicio,
}) {
  const nomesDoDesempate = desempate
    ? desempate.vencedores.map((t) => desempate.placar.find((l) => l.time === t).nome)
    : null;
  const vencedores = nomesDoDesempate ?? placar.filter((l) => l.posicao === 1).map((l) => l.nome);
  const empate = vencedores.length > 1;
  let capa;
  if (desempate) {
    capa = empate
      ? { emoji: '🤝', rotulo: 'Vitória dividida entre', frase: FRASES.empateEterno }
      : { emoji: '⚡', rotulo: 'Vitória no desempate de', frase: FRASES.desempate };
  } else {
    capa = empate
      ? { emoji: '🤝', rotulo: 'Empate entre', frase: FRASES.empate }
      : { emoji: '🏆', rotulo: 'Vitória de', frase: FRASES_VITORIA[tipoDeVitoria(placar)] }; // texto conforme a margem
  }

  const fraseDoUltimo = fraseLanterna(placar, { plural });
  const lanterna = fraseDoUltimo ? `<p class="muted centro">${comNome(fraseDoUltimo, placar.at(-1).nome)}</p>` : '';
  const oferta = podeDesempatar ? `
    <section class="card oferta-desempate entrar" data-oferta>
      <h2>Empate no topo!</h2>
      <p>Desempate: cada um faz <b>1 mímica difícil</b>, mesmo tempo de sempre. Quem fizer a galera acertar leva o troféu.</p>
      <div class="linha botoes-oferta">
        <button class="btn btn-primario" data-acao="desempate">⚡ Desempate</button>
        <button class="btn" data-acao="ficaEmpatado">Fica empatado mesmo</button>
      </div>
    </section>` : '';
  const cardDesempate = desempate
    ? `<section class="card entrar"><h2>⚡ Desempate</h2>${placarHtml(desempate.placar)}</section>`
    : '';
  const listaPremios = premios.length > 0 ? `
    <section class="premios" aria-labelledby="titulo-premios">
      <h2 id="titulo-premios">🏅 Prêmios da noite</h2>
      <ul>${premios.map((p, i) => `
        <li class="premio entrar" style="--i:${i}">
          <span class="premio-emoji" aria-hidden="true">${esc(p.emoji)}</span>
          <span class="premio-corpo">
            <span class="premio-titulo">${esc(p.titulo)}</span>
            <b class="premio-quem">${esc(p.quem)}</b>
            <span class="premio-detalhe">${esc(p.detalhe)}</span>
          </span>
        </li>`).join('')}
      </ul>
    </section>` : '';

  el.innerHTML = `
    <section class="card capa entrar">
      <div class="emoji" aria-hidden="true">${capa.emoji}</div>
      <p class="muted"><b>${capa.rotulo}</b></p>
      <h1>${esc(juntarNomes(vencedores))}</h1>
      <p>${esc(escolher(capa.frase))}</p>
    </section>
    ${oferta}
    ${cardDesempate}
    <ol class="placar final">${placar.map((l) => `
      <li class="entrar" data-posicao="${l.posicao}"><span>${MEDALHAS[l.posicao] ?? `${l.posicao}º`} ${esc(l.nome)}</span><b>${l.pontos}</b></li>`).join('')}
    </ol>
    ${lanterna}
    ${listaPremios}
    <div class="rodape">
      <button class="btn btn-primario" data-acao="denovo">Revanche: jogar de novo</button>
      <button class="btn" data-acao="compartilhar">📤 Compartilhar resultado</button>
      <button class="btn" data-acao="inicio">Voltar ao início</button>
    </div>`;

  // A imagem é gerada já na chegada: o share precisa sair no mesmo toque, sem esperar o canvas.
  const resumo = { placar, premios, desempate: nomesDoDesempate && { vencedores: nomesDoDesempate } };
  let imagem = null;
  gerarImagem(resumo).then((blob) => { imagem = blob; });

  ligar(el, {
    denovo: aoJogarDeNovo,
    inicio: aoInicio,
    desempate: aoDesempate,
    compartilhar: () => compartilharResultado(resumo, imagem),
    ficaEmpatado: () => {
      el.querySelector('[data-oferta]')?.remove();
      el.querySelector('h1')?.focus({ preventScroll: true });
    },
  });
  tocarFanfarra();
  return confete();
}
