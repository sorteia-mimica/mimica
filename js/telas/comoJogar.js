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
        <li><b>Individual</b> (3 ou mais): um faz e todo mundo chuta. Ganham pontos quem fez e quem acertou. Com 2 seria empate garantido — aí joga em dupla!</li>
        <li>Os itens da vez vêm de temas diferentes sempre que der — pode (e deve) dizer o tema em voz alta.</li>
        <li>A tela da vez diz em letras garrafais com quem fica o celular 📱. Toque em <b>Sortear</b>, <b>segure o botão</b> pra revelar (só você olha 🙈) e decore os itens.</li>
        <li>Vale gesto, careta e dancinha. Falar, não vale 🤐</li>
        <li>Na mímica os itens ficam escondidos: <b>segure o cartão</b> pra espiar. Toque no ✓ de cada item que a galera acertar — <b>gabaritou antes do tempo?</b> A vez acaba sozinha 🎯. No Individual, depois vem a conferência: quem matou a charada?</li>
        <li>Sons demais? O botão 🔊/🔇 na tela inicial e na mímica liga e desliga tudo.</li>
        <li>Pontos: fácil 1, médio 2, difícil 4 (dá pra mudar no Personalizado). Na hora de montar a partida aparece quanto tempo ela deve durar.</li>
        <li>Na <b>revanche</b> a ordem é sorteada de novo: quem abriu a última não abre esta.</li>
      </ol>
    </section>
    <div class="rodape"><button class="btn btn-primario" data-acao="voltar">Entendi, voltar</button></div>`;
  ligar(el, { voltar: aoVoltar });
}
