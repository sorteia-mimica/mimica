import { esc, ligar } from '../dom.js';

export function telaErro(el, { mensagem, aoTentar }) {
  el.classList.add('erro');
  el.innerHTML = `
    <section class="card capa entrar">
      <div class="emoji" aria-hidden="true">🙃</div>
      <h1>Eita, deu ruim</h1>
      <p>${esc(mensagem)}</p>
      <p class="muted">Confere a internet e tenta de novo — na primeira vez o jogo precisa dela.</p>
    </section>
    <div class="rodape"><button class="btn btn-primario" data-acao="tentar">Tentar de novo</button></div>`;
  ligar(el, { tentar: aoTentar });
}
