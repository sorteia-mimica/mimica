import { esc, ligar } from '../dom.js';

const MEDALHAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function telaFinal(el, { placar, aoJogarDeNovo, aoInicio }) {
  const vencedores = placar.filter((l) => l.posicao === 1).map((l) => esc(l.nome));
  el.innerHTML = `
    <section class="card capa entrar">
      <div class="emoji">🏆</div>
      <p class="muted">${vencedores.length > 1 ? 'Empate!' : 'Vitória de'}</p>
      <h1>${vencedores.join(' e ')}</h1>
    </section>
    <ol class="placar final">${placar.map((l) => `
      <li><span>${MEDALHAS[l.posicao] ?? `${l.posicao}º`} ${esc(l.nome)}</span><b>${l.pontos}</b></li>`).join('')}
    </ol>
    <div class="rodape">
      <button class="btn btn-primario" data-acao="denovo">Jogar de novo</button>
      <button class="btn" data-acao="inicio">Início</button>
    </div>`;
  ligar(el, { denovo: aoJogarDeNovo, inicio: aoInicio });
}
