import { ligar } from '../dom.js';

export function telaComoJogar(el, { aoVoltar }) {
  el.innerHTML = `
    <header>
      <h1>Como jogar</h1>
      <p class="muted sub">Regras em 30 segundos — menos que uma mímica.</p>
    </header>
    <section class="card entrar">
      <ol class="lista">
        <li><b>Duplas:</b> um faz a mímica e o parceiro adivinha. Na vez seguinte da dupla, troca quem faz.</li>
        <li><b>Individual:</b> um faz e todo mundo chuta. Ganham pontos quem fez e quem acertou.</li>
        <li>Cada item da vez vem de um tema diferente — pode (e deve) dizer o tema em voz alta.</li>
        <li>Na sua vez, toque em <b>Sortear</b> e decore os itens sem deixar ninguém espiar.</li>
        <li>Vale gesto, careta e dancinha. Falar, não vale 🤐</li>
        <li>Marque ✓ em cada item que a galera acertar antes do tempo acabar.</li>
        <li>Pontos: fácil 1, médio 2, difícil 3 (dá pra mudar no Personalizado).</li>
      </ol>
    </section>
    <div class="rodape"><button class="btn btn-primario" data-acao="voltar">Entendi, voltar</button></div>`;
  ligar(el, { voltar: aoVoltar });
}
