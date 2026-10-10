import { esc, ligar } from '../dom.js';
import { FRASES, escolher } from '../frases.js';

export function telaInicio(el, { temPartidaSalva, aoJogar, aoContinuar, aoComoJogar }) {
  el.classList.add('inicio');
  el.innerHTML = `
    <header class="card capa entrar">
      <div class="emoji" aria-hidden="true">🎭</div>
      <h1>Sorteia Mímica</h1>
      <p class="muted">${esc(escolher(FRASES.subtitulo))}</p>
    </header>
    <div class="rodape">
      ${temPartidaSalva ? '<button class="btn btn-primario" data-acao="continuar">Continuar partida</button>' : ''}
      <button class="btn ${temPartidaSalva ? '' : 'btn-primario'}" data-acao="jogar">${temPartidaSalva ? 'Nova partida' : 'Bora jogar!'}</button>
      <button class="btn" data-acao="como">Como jogar</button>
    </div>
    <footer class="assinatura">Feito por Breno Sayão · engenheiro de dados 🛠️</footer>`;
  ligar(el, { jogar: aoJogar, continuar: aoContinuar, como: aoComoJogar });
}
