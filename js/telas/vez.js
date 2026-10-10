import { esc, ligar, placarHtml } from '../dom.js';
import { FRASES, comNome, escolher } from '../frases.js';

export function telaVez(el, { vez, modo, totalVoltas, placar, aoSortear, aoSair }) {
  const titulo = modo === 'duplas'
    ? `<b>${esc(vez.quemFaz)}</b> faz<span class="seta" aria-hidden="true">↓</span><b>${esc(vez.quemAdivinha)}</b> adivinha`
    : `Vez de <b>${esc(vez.quemFaz)}</b>`;
  el.innerHTML = `
    <div class="linha entre">
      <span class="pilula">Volta ${vez.volta} de ${totalVoltas}</span>
      <button class="btn btn-pequeno" data-acao="sair" aria-label="Sair (a partida fica salva)">Sair</button>
    </div>
    <section class="card capa entrar">
      <div class="emoji" aria-hidden="true">${modo === 'duplas' ? '🤝' : '🎭'}</div>
      <h1 class="vez">${titulo}</h1>
      ${modo === 'duplas' ? '' : '<p class="muted">O resto da galera chuta!</p>'}
      <p class="frase">${comNome(escolher(FRASES.vez), vez.quemFaz)}</p>
    </section>
    <section class="card"><h2>Placar</h2>${placarHtml(placar)}</section>
    <div class="rodape"><button class="btn btn-primario" data-acao="sortear">🎲 Sortear itens</button></div>`;
  ligar(el, { sortear: aoSortear, sair: aoSair });
}
