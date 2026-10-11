import { esc, ligar, placarHtml } from '../dom.js';
import { FRASES, comNome, escolher } from '../frases.js';
import { confirmar } from '../modal.js';

export function telaVez(el, { vez, modo, totalVoltas, placar, aoSortear, aoSair }) {
  // Quem segura o celular é o recado principal (dá pra ler do outro lado da sala); a piada vem embaixo, menor.
  const papeis = modo === 'duplas'
    ? `<b>${esc(vez.quemFaz)}</b> faz <span aria-hidden="true">→</span><span class="sr-only">e</span> <b>${esc(vez.quemAdivinha)}</b> adivinha`
    : `<b>${esc(vez.quemFaz)}</b> faz · o resto da galera chuta!`;
  el.innerHTML = `
    <div class="linha entre">
      <span class="pilula">Volta ${vez.volta} de ${totalVoltas}</span>
      <button class="btn btn-pequeno" data-acao="sair" aria-label="Sair (a partida fica salva)">Sair</button>
    </div>
    <section class="card capa celular-com entrar">
      <h1 class="vez"><span class="celular-rotulo"><span aria-hidden="true">📱</span> Celular com</span> <span class="vez-nome">${esc(vez.quemFaz)}</span></h1>
      <p class="papeis">${papeis}</p>
    </section>
    <p class="frase muted centro">${comNome(escolher(FRASES.vez), vez.quemFaz)}</p>
    <section class="card"><h2>Placar</h2>${placarHtml(placar)}</section>
    <div class="rodape"><button class="btn btn-primario" data-acao="sortear">🎲 Sortear itens</button></div>`;
  ligar(el, {
    sortear: aoSortear,
    sair: async () => {
      const sair = await confirmar({
        titulo: 'Sair da partida?',
        texto: 'Relaxa: ela fica salva pra continuar depois.',
        sim: 'Sair',
        nao: 'Ficar',
      });
      if (sair) aoSair();
    },
  });
}
