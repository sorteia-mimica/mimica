import { esc, ligar } from '../dom.js';
import { confete } from '../efeitos.js';
import { FRASES, comNome, escolher } from '../frases.js';

const MEDALHAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

// "A", "A e B", "A, B e C" (nomes já escapados).
const juntar = (nomes) => (nomes.length < 2 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`);

export function telaFinal(el, { placar, aoJogarDeNovo, aoInicio }) {
  const vencedores = placar.filter((l) => l.posicao === 1).map((l) => esc(l.nome));
  const empate = vencedores.length > 1;
  const ultimaPosicao = placar.at(-1)?.posicao ?? 1;
  const lanternas = placar.filter((l) => l.posicao === ultimaPosicao);
  const lanterna = ultimaPosicao > 1 && lanternas.length === 1
    ? `<p class="muted centro">${comNome(escolher(FRASES.lanterna), lanternas[0].nome)}</p>`
    : '';
  el.innerHTML = `
    <section class="card capa entrar">
      <div class="emoji" aria-hidden="true">${empate ? '🤝' : '🏆'}</div>
      <p class="muted"><b>${empate ? 'Empate entre' : 'Vitória de'}</b></p>
      <h1>${juntar(vencedores)}</h1>
      <p>${esc(escolher(empate ? FRASES.empate : FRASES.vitoria))}</p>
    </section>
    <ol class="placar final">${placar.map((l) => `
      <li class="entrar" data-posicao="${l.posicao}"><span>${MEDALHAS[l.posicao] ?? `${l.posicao}º`} ${esc(l.nome)}</span><b>${l.pontos}</b></li>`).join('')}
    </ol>
    ${lanterna}
    <div class="rodape">
      <button class="btn btn-primario" data-acao="denovo">Revanche: jogar de novo</button>
      <button class="btn" data-acao="inicio">Voltar ao início</button>
    </div>`;
  ligar(el, { denovo: aoJogarDeNovo, inicio: aoInicio });
  return confete();
}
