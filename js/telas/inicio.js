import { esc, ligar } from '../dom.js';
import { ligarBotaoSom } from '../sons.js';
import { FRASES, escolher } from '../frases.js';

export function telaInicio(el, { temPartidaSalva, aoJogar, aoContinuar, aoComoJogar }) {
  el.classList.add('inicio');
  el.innerHTML = `
    <header class="card capa entrar">
      <button class="btn-tema btn-som" data-som></button>
      <button class="btn-tema" data-acao="tema"></button>
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
  const botaoTema = el.querySelector('[data-acao="tema"]');
  const pintarBotaoTema = () => {
    const escuro = document.documentElement.dataset.theme === 'dark';
    botaoTema.textContent = escuro ? '☀️' : '🌙';
    botaoTema.setAttribute('aria-label', escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro');
  };
  pintarBotaoTema();
  ligarBotaoSom(el.querySelector('[data-som]'));
  ligar(el, {
    jogar: aoJogar,
    continuar: aoContinuar,
    como: aoComoJogar,
    tema: () => {
      const escuro = document.documentElement.dataset.theme === 'dark';
      try { localStorage.setItem('mimica:tema', escuro ? 'claro' : 'escuro'); } catch { /* sem storage: vale só nesta visita */ }
      if (window.aplicarTema) window.aplicarTema();
      else document.documentElement.dataset.theme = escuro ? 'light' : 'dark';
      pintarBotaoTema();
    },
  });
}
