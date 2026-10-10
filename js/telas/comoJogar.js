import { ligar } from '../dom.js';

export function telaComoJogar(el, { aoVoltar }) {
  el.innerHTML = `
    <h1>Como jogar</h1>
    <section class="card">
      <ol class="lista">
        <li><b>Duplas:</b> um faz a mímica e o parceiro adivinha; os papéis invertem a cada vez da dupla.</li>
        <li><b>Individual:</b> um faz e todos adivinham. Quem fez e quem acertou ganham os pontos.</li>
        <li>Cada item da vez vem de um tema diferente — quem faz pode dizer o tema em voz alta.</li>
        <li>Na sua vez, toque em <b>Sortear</b> e leia os itens em segredo.</li>
        <li>Faça as mímicas antes do tempo acabar e marque ✓ no que acertarem.</li>
        <li>Pontos: fácil 1, médio 2, difícil 3 (dá para mudar no Personalizado).</li>
      </ol>
    </section>
    <div class="rodape"><button class="btn btn-primario" data-acao="voltar">Voltar</button></div>`;
  ligar(el, { voltar: aoVoltar });
}
