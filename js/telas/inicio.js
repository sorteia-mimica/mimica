import { ligar } from '../dom.js';

export function telaInicio(el, { temPartidaSalva, aoJogar, aoContinuar, aoComoJogar }) {
  el.classList.add('inicio');
  el.innerHTML = `
    <header class="card capa entrar">
      <div class="emoji">🎭</div>
      <h1>Sorteia Mímica</h1>
      <p class="muted">Sorteie, encene e some os pontos.</p>
    </header>
    <div class="rodape">
      ${temPartidaSalva ? '<button class="btn btn-primario" data-acao="continuar">Continuar partida</button>' : ''}
      <button class="btn ${temPartidaSalva ? '' : 'btn-primario'}" data-acao="jogar">${temPartidaSalva ? 'Nova partida' : 'Jogar'}</button>
      <button class="btn" data-acao="como">Como jogar</button>
    </div>`;
  ligar(el, { jogar: aoJogar, continuar: aoContinuar, como: aoComoJogar });
}
