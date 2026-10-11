import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarVoltaSilenciosa } from '../js/voltar.js';

// Histórico falso como o do navegador: pushState é síncrono; back() só anda (e dispara popstate) depois.
function historicoFalso() {
  const pilha = [null];
  let i = 0;
  const ouvintes = [];
  return {
    get state() { return pilha[i]; },
    pushState(estado) { pilha.splice(i + 1); pilha.push(estado); i += 1; },
    back() {
      setTimeout(() => {
        if (i === 0) return;
        i -= 1;
        for (const f of ouvintes) f();
      }, 5);
    },
    aoPopstate(f) { ouvintes.push(f); },
  };
}

test('voltar() só resolve quando o popstate da volta chega; esse popstate é engolido', async () => {
  const h = historicoFalso();
  const volta = criarVoltaSilenciosa({ history: h });
  const doUsuario = [];
  h.aoPopstate(() => { if (!volta.engolir()) doUsuario.push(h.state); });
  h.pushState({ modal: true });
  let resolveu = false;
  const p = volta.voltar().then(() => { resolveu = true; });
  await Promise.resolve();
  assert.equal(resolveu, false, 'não resolve antes da volta acontecer');
  assert.equal(volta.pendente, true);
  await p;
  assert.equal(h.state, null);
  assert.deepEqual(doUsuario, [], 'a volta silenciosa não conta como voltar do usuário');
  assert.equal(volta.engolir(), false, 'nada pendente: popstate seguinte é do usuário');
});

test('regressão: quem espera o voltar() empilha a entrada nova DEPOIS da volta (não cai na entrada base)', async () => {
  const h = historicoFalso();
  const volta = criarVoltaSilenciosa({ history: h });
  h.aoPopstate(() => volta.engolir());
  // Início na entrada base → abre o modal → "Sim" → a tela seguinte empilha a entrada que segura o voltar.
  h.pushState({ modal: true });
  await volta.voltar();
  h.pushState({ mimica: true });
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(h.state, { mimica: true }, 'a entrada do jogo continua no topo');
});

test('sem popstate (navegador não andou), resolve sozinho depois de esperaMaxMs e não engole o próximo', async () => {
  const h = { back() {} };
  const volta = criarVoltaSilenciosa({ history: h, esperaMaxMs: 10 });
  await volta.voltar();
  assert.equal(volta.pendente, false);
  assert.equal(volta.engolir(), false);
});
