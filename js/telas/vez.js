import { esc, ligar, placarHtml } from '../dom.js';

export function telaVez(el, { vez, modo, totalVoltas, placar, aoSortear, aoSair }) {
  const titulo = modo === 'duplas'
    ? `<b>${esc(vez.quemFaz)}</b> faz<br>→ <b>${esc(vez.quemAdivinha)}</b> adivinha`
    : `Vez de <b>${esc(vez.quemFaz)}</b>`;
  el.innerHTML = `
    <div class="linha entre">
      <span class="muted">Volta ${vez.volta} de ${totalVoltas}</span>
      <button class="btn btn-pequeno" data-acao="sair" aria-label="Sair (a partida fica salva)">Sair</button>
    </div>
    <section class="card capa entrar">
      <div class="emoji">🎭</div>
      <h1 class="vez">${titulo}</h1>
      <p class="muted">Passe o celular para ${esc(vez.quemFaz)}. Só quem faz pode olhar!</p>
    </section>
    <section class="card"><h2>Placar</h2>${placarHtml(placar)}</section>
    <div class="rodape"><button class="btn btn-primario" data-acao="sortear">🎲 Sortear</button></div>`;
  ligar(el, { sortear: aoSortear, sair: aoSair });
}
