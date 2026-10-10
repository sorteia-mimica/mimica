import { esc, ligar } from '../dom.js';

export function telaErro(el, { mensagem, aoTentar }) {
  el.innerHTML = `
    <section class="card capa entrar">
      <div class="emoji">😕</div>
      <p>${esc(mensagem)}</p>
    </section>
    <div class="rodape"><button class="btn btn-primario" data-acao="tentar">Tentar de novo</button></div>`;
  ligar(el, { tentar: aoTentar });
}
