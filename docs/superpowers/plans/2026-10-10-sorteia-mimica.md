# Sorteia Mímica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jogo de mímica num único celular (GitHub Pages) que sorteia itens por tema/dificuldade, controla o tempo e soma pontos em modo Duplas ou Individual.

**Architecture:** Site estático, uma página que troca de tela. A regra de jogo vive em módulos puros (`sorteio.js`, `config.js`, `jogo.js`, `tempo.js`, `armazenamento.js`) testados com `node --test`; as telas (`js/telas/*.js`) só renderizam HTML e chamam callbacks; `app.js` é o roteador que guarda o estado e persiste no `localStorage`. PWA via `manifest.json` + `sw.js`.

**Tech Stack:** HTML, CSS, JavaScript puro (ES modules), Node 22 só para testes (`node:test`), Python/PIL só para gerar ícones.

**Spec:** `docs/superpowers/specs/2026-10-10-sorteia-mimica-design.md`

## Global Constraints

- Hospedagem: GitHub Pages, branch `main`, raiz; site servido em `/mimica/` → **todos os caminhos relativos** (nada começando com `/`).
- Sem build, sem dependências de runtime; `package.json` existe só para `"type": "module"` e o script de teste.
- Testes sempre com cap de paralelismo: `npm test` = `node --test --test-concurrency=4`.
- Interface em português do Brasil.
- Padrão: 3 voltas, 1 fácil + 1 médio + 1 difícil por vez, leitura 10 s, mímica 90 s, pontos 1/2/3.
- Personalizado: voltas 1–10; mímica 30–300 s em passos de 15 s; leitura 5–30 s; 0–3 itens por dificuldade com total 1–6; pontos 1–5 por dificuldade.
- Duplas: mínimo 2 duplas de 2. Individual: mínimo 2 jogadores. Pontuação Individual = quem fez **e** quem acertou.
- Cada item da vez vem de tema diferente; item não repete na partida; lista esgotada é reembaralhada.
- Todo texto vindo do usuário ou do JSON passa por `esc()` antes de ir para `innerHTML`.
- Respeitar `prefers-reduced-motion` e `prefers-color-scheme`.

## Review Focus

1. Nome de jogador com HTML (`<img src=x onerror=alert(1)>`) → aparece literal em todas as telas, nada executa. Teste em Task 4 (`esc`, `itemHtml`, `placarHtml`).
2. Nomes que só diferem por caixa/espaço (`"Ana"` e `" ana "`) → configuração bloqueada com "Há nomes repetidos.". Teste em Task 2.
3. Partida salva corrompida, de outra versão ou citando tema que saiu do JSON → "Continuar partida" não aparece e nada quebra. Testes em Task 3 (`partidaCompativel`) e Task 4 (JSON inválido no storage).
4. Celular bloqueado/app em segundo plano durante a mímica → ao voltar, o cronômetro mostra o tempo real restante (ou já terminou). Teste em Task 4 (`iniciarCronometro` com relógio que salta).
5. Abrir o app sem internet depois da primeira visita → todos os arquivos carregados estão no cache do service worker. Teste em Task 9 (`sw.test.js`).

---

### Task 1: Base do projeto + sorteio

**Files:**
- Create: `package.json`
- Create: `js/sorteio.js`
- Create: `test/ajuda.js`
- Test: `test/sorteio.test.js`

**Interfaces:**
- Produces:
  - `DIFICULDADES: ['facil','medio','dificil']`
  - `embaralhar<T>(lista: T[], rng?: () => number): T[]` (cópia)
  - `montarDificuldades(mix: {facil,medio,dificil: number}, rng?): string[]`
  - `escolherTemas(temasEscolhidos: string[], quantidade: number, rng?): string[]`
  - `sortearVez({ temas: Tema[], temasEscolhidos: string[], mix, usados?: Record<string,string[]>, rng? }) → { itens: Item[], usados }`
  - `Tema = { id, nome, emoji, itens: { facil: string[], medio: string[], dificil: string[] } }`
  - `Item = { temaId, temaNome, emoji, dificuldade, texto }`, `itens` ordenados fácil → médio → difícil
  - chave de `usados`: `` `${temaId}:${dificuldade}` ``
  - `test/ajuda.js`: `rngSemente(n)`, `temaFalso(id, n=5)`

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "sorteia-mimica",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test --test-concurrency=4"
  }
}
```

- [ ] **Step 2: Criar `test/ajuda.js`**

```js
// Gerador determinístico (mulberry32) para testes reprodutíveis.
export function rngSemente(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function temaFalso(id, n = 5) {
  const lista = (d) => Array.from({ length: n }, (_, i) => `${id}-${d}-${i}`);
  return {
    id,
    nome: id.toUpperCase(),
    emoji: '⭐',
    itens: { facil: lista('facil'), medio: lista('medio'), dificil: lista('dificil') },
  };
}
```

- [ ] **Step 3: Escrever os testes que falham — `test/sorteio.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFICULDADES, embaralhar, montarDificuldades, escolherTemas, sortearVez } from '../js/sorteio.js';
import { rngSemente, temaFalso } from './ajuda.js';

const TEMAS = ['a', 'b', 'c', 'd', 'e'].map((id) => temaFalso(id));
const MIX_PADRAO = { facil: 1, medio: 1, dificil: 1 };

test('embaralhar devolve cópia com os mesmos elementos', () => {
  const original = [1, 2, 3, 4, 5];
  const r = embaralhar(original, rngSemente(1));
  assert.deepEqual(original, [1, 2, 3, 4, 5]);
  assert.deepEqual([...r].sort(), [1, 2, 3, 4, 5]);
});

test('montarDificuldades respeita o mix', () => {
  const d = montarDificuldades({ facil: 2, medio: 0, dificil: 1 }, rngSemente(1));
  assert.deepEqual([...d].sort(), ['dificil', 'facil', 'facil']);
});

test('escolherTemas: temas distintos quando há temas suficientes', () => {
  for (let s = 1; s <= 50; s++) {
    const ids = escolherTemas(['a', 'b', 'c', 'd', 'e'], 3, rngSemente(s));
    assert.equal(ids.length, 3);
    assert.equal(new Set(ids).size, 3);
  }
});

test('escolherTemas: repete de forma equilibrada quando faltam temas', () => {
  for (let s = 1; s <= 20; s++) {
    const ids = escolherTemas(['a', 'b'], 3, rngSemente(s));
    const a = ids.filter((x) => x === 'a').length;
    assert.equal(ids.length, 3);
    assert.ok(a === 1 || a === 2);
  }
});

test('sortearVez padrão com 3 temas: 1 de cada tema e de cada dificuldade, em ordem', () => {
  for (let s = 1; s <= 30; s++) {
    const { itens } = sortearVez({ temas: TEMAS, temasEscolhidos: ['a', 'b', 'c'], mix: MIX_PADRAO, rng: rngSemente(s) });
    assert.deepEqual(itens.map((i) => i.dificuldade), DIFICULDADES);
    assert.deepEqual(new Set(itens.map((i) => i.temaId)), new Set(['a', 'b', 'c']));
  }
});

test('sortearVez com 1 tema: todos os itens do mesmo tema', () => {
  const { itens } = sortearVez({ temas: TEMAS, temasEscolhidos: ['d'], mix: MIX_PADRAO, rng: rngSemente(3) });
  assert.ok(itens.every((i) => i.temaId === 'd'));
});

test('item traz tema, emoji, dificuldade e texto da lista certa', () => {
  const { itens } = sortearVez({ temas: TEMAS, temasEscolhidos: ['a'], mix: { facil: 1, medio: 0, dificil: 0 }, rng: rngSemente(2) });
  const [item] = itens;
  assert.equal(item.temaId, 'a');
  assert.equal(item.temaNome, 'A');
  assert.equal(item.emoji, '⭐');
  assert.equal(item.dificuldade, 'facil');
  assert.ok(TEMAS[0].itens.facil.includes(item.texto));
});

test('sortearVez não repete item já usado', () => {
  const temas = [temaFalso('a', 3)];
  let usados = {};
  const vistos = new Set();
  for (let i = 0; i < 3; i++) {
    const r = sortearVez({ temas, temasEscolhidos: ['a'], mix: { facil: 1, medio: 0, dificil: 0 }, usados, rng: rngSemente(i + 1) });
    vistos.add(r.itens[0].texto);
    usados = r.usados;
  }
  assert.equal(vistos.size, 3);
});

test('sortearVez reembaralha a lista quando esgota', () => {
  const temas = [temaFalso('a', 3)];
  const usados = { 'a:facil': [...temas[0].itens.facil] };
  const r = sortearVez({ temas, temasEscolhidos: ['a'], mix: { facil: 1, medio: 0, dificil: 0 }, usados, rng: rngSemente(9) });
  assert.ok(temas[0].itens.facil.includes(r.itens[0].texto));
  assert.deepEqual(r.usados['a:facil'], [r.itens[0].texto]);
});

test('sortearVez não repete item dentro da mesma vez', () => {
  const temas = [temaFalso('a', 3)];
  const { itens } = sortearVez({ temas, temasEscolhidos: ['a'], mix: { facil: 3, medio: 0, dificil: 0 }, rng: rngSemente(4) });
  assert.equal(new Set(itens.map((i) => i.texto)).size, 3);
});

test('sortearVez com mix personalizado', () => {
  const { itens } = sortearVez({ temas: TEMAS, temasEscolhidos: ['a', 'b', 'c', 'd', 'e'], mix: { facil: 2, medio: 0, dificil: 2 }, rng: rngSemente(5) });
  assert.deepEqual(itens.map((i) => i.dificuldade), ['facil', 'facil', 'dificil', 'dificil']);
  assert.equal(new Set(itens.map((i) => i.temaId)).size, 4);
});

test('sortearVez não altera o objeto usados recebido', () => {
  const usados = { 'a:facil': ['a-facil-0'] };
  sortearVez({ temas: TEMAS, temasEscolhidos: ['a'], mix: { facil: 1, medio: 0, dificil: 0 }, usados, rng: rngSemente(6) });
  assert.deepEqual(usados, { 'a:facil': ['a-facil-0'] });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../js/sorteio.js'`

- [ ] **Step 5: Implementar `js/sorteio.js`**

```js
export const DIFICULDADES = ['facil', 'medio', 'dificil'];

export function embaralhar(lista, rng = Math.random) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function montarDificuldades(mix, rng = Math.random) {
  const lista = DIFICULDADES.flatMap((d) => Array(mix[d] ?? 0).fill(d));
  return embaralhar(lista, rng);
}

// Ciclos completos embaralhados: com temas suficientes não repete;
// com poucos, cada tema aparece no máximo 1 vez a mais que os outros.
export function escolherTemas(temasEscolhidos, quantidade, rng = Math.random) {
  const resultado = [];
  while (resultado.length < quantidade) {
    resultado.push(...embaralhar(temasEscolhidos, rng));
  }
  return resultado.slice(0, quantidade);
}

export function sortearVez({ temas, temasEscolhidos, mix, usados = {}, rng = Math.random }) {
  const dificuldades = montarDificuldades(mix, rng);
  const ids = escolherTemas(temasEscolhidos, dificuldades.length, rng);
  const novosUsados = { ...usados };

  const itens = dificuldades.map((dificuldade, i) => {
    const tema = temas.find((t) => t.id === ids[i]);
    const chave = `${tema.id}:${dificuldade}`;
    const lista = tema.itens[dificuldade];
    let jaUsados = novosUsados[chave] ?? [];
    let disponiveis = lista.filter((texto) => !jaUsados.includes(texto));
    if (disponiveis.length === 0) {
      jaUsados = [];
      disponiveis = [...lista];
    }
    const texto = disponiveis[Math.floor(rng() * disponiveis.length)];
    novosUsados[chave] = [...jaUsados, texto];
    return { temaId: tema.id, temaNome: tema.nome, emoji: tema.emoji, dificuldade, texto };
  });

  itens.sort((a, b) => DIFICULDADES.indexOf(a.dificuldade) - DIFICULDADES.indexOf(b.dificuldade));
  return { itens, usados: novosUsados };
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test`
Expected: PASS, 11 testes.

- [ ] **Step 7: Commit**

```bash
git add package.json js/sorteio.js test/ajuda.js test/sorteio.test.js
git commit -m "feat: sorteio de itens por tema e dificuldade"
```

---

### Task 2: Configuração (padrão, validação, formulário)

**Files:**
- Create: `js/config.js`
- Test: `test/config.test.js`

**Interfaces:**
- Consumes: `DIFICULDADES` de `js/sorteio.js`.
- Produces:
  - `Config = { modo: 'duplas'|'individual', times: [{ membros: string[] }], temas: string[], voltas, tempoLeitura, tempoMimica, mix: {facil,medio,dificil}, pontos: {facil,medio,dificil} }` (tempos em segundos)
  - `Form = { modo, times, temas, personalizado: boolean, extras: { voltas, tempoLeitura, tempoMimica, mix, pontos } }`
  - `PADRAO` (o objeto `extras` padrão)
  - `validarConfig(config): string[]` (mensagens em pt-BR; vazio = válido)
  - `montarConfig(form): Config`, `formVazio(): Form`, `formDeConfig(config): Form`, `trocarModo(form, modo): Form`
  - `lerCaminho(obj, 'mix.facil')`, `escreverCaminho(obj, 'mix.facil', valor)`

- [ ] **Step 1: Escrever os testes que falham — `test/config.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PADRAO, validarConfig, montarConfig, formVazio, formDeConfig, trocarModo, lerCaminho, escreverCaminho } from '../js/config.js';

const valida = (extra = {}) => ({
  modo: 'duplas',
  times: [{ membros: ['Ana', 'Beto'] }, { membros: ['Caio', 'Duda'] }],
  temas: ['futebol'],
  ...structuredClone(PADRAO),
  ...extra,
});

test('PADRAO tem os valores da spec', () => {
  assert.deepEqual(PADRAO, {
    voltas: 3, tempoLeitura: 10, tempoMimica: 90,
    mix: { facil: 1, medio: 1, dificil: 1 },
    pontos: { facil: 1, medio: 2, dificil: 3 },
  });
});

test('config válida não tem erros', () => {
  assert.deepEqual(validarConfig(valida()), []);
  assert.deepEqual(validarConfig(valida({ modo: 'individual', times: [{ membros: ['Ana'] }, { membros: ['Beto'] }] })), []);
});

test('mínimo de 2 jogadores / 2 duplas', () => {
  assert.ok(validarConfig(valida({ modo: 'individual', times: [{ membros: ['Ana'] }] })).includes('Adicione pelo menos 2 jogadores.'));
  assert.ok(validarConfig(valida({ times: [{ membros: ['Ana', 'Beto'] }] })).includes('Adicione pelo menos 2 duplas.'));
});

test('nomes vazios ou dupla incompleta', () => {
  assert.ok(validarConfig(valida({ times: [{ membros: ['Ana', '  '] }, { membros: ['Caio', 'Duda'] }] })).includes('Preencha todos os nomes.'));
  assert.ok(validarConfig(valida({ times: [{ membros: ['Ana'] }, { membros: ['Caio', 'Duda'] }] })).includes('Preencha todos os nomes.'));
});

test('nomes repetidos ignorando caixa e espaços', () => {
  const erros = validarConfig(valida({ modo: 'individual', times: [{ membros: ['Ana'] }, { membros: [' ana '] }] }));
  assert.ok(erros.includes('Há nomes repetidos.'));
});

test('pelo menos 1 tema', () => {
  assert.ok(validarConfig(valida({ temas: [] })).includes('Escolha pelo menos 1 tema.'));
});

test('limites do personalizado', () => {
  assert.ok(validarConfig(valida({ voltas: 0 })).includes('Voltas: de 1 a 10.'));
  assert.ok(validarConfig(valida({ voltas: 11 })).includes('Voltas: de 1 a 10.'));
  assert.ok(validarConfig(valida({ tempoMimica: 100 })).includes('Tempo de mímica: de 30 s a 5 min, de 15 em 15 s.'));
  assert.ok(validarConfig(valida({ tempoMimica: 315 })).includes('Tempo de mímica: de 30 s a 5 min, de 15 em 15 s.'));
  assert.ok(validarConfig(valida({ tempoLeitura: 4 })).includes('Tempo de leitura: de 5 a 30 s.'));
  assert.ok(validarConfig(valida({ mix: { facil: 4, medio: 0, dificil: 0 } })).includes('Itens por dificuldade: de 0 a 3.'));
  assert.ok(validarConfig(valida({ mix: { facil: 0, medio: 0, dificil: 0 } })).includes('Total de itens por vez: de 1 a 6.'));
  assert.ok(validarConfig(valida({ pontos: { facil: 0, medio: 2, dificil: 3 } })).includes('Pontos por dificuldade: de 1 a 5.'));
  assert.deepEqual(validarConfig(valida({ voltas: 10, tempoMimica: 300, tempoLeitura: 30, mix: { facil: 3, medio: 0, dificil: 3 }, pontos: { facil: 5, medio: 5, dificil: 5 } })), []);
});

test('montarConfig: padrão ignora extras, personalizado usa extras, nomes sem espaços', () => {
  const form = formVazio();
  form.times = [{ membros: [' Ana ', 'Beto'] }, { membros: ['Caio', 'Duda'] }];
  form.temas = ['animal'];
  form.extras.voltas = 7;
  assert.equal(montarConfig(form).voltas, 3);
  assert.equal(montarConfig(form).times[0].membros[0], 'Ana');
  form.personalizado = true;
  assert.equal(montarConfig(form).voltas, 7);
});

test('formVazio: duplas, 2 duplas vazias, extras independentes do PADRAO', () => {
  const form = formVazio();
  assert.equal(form.modo, 'duplas');
  assert.deepEqual(form.times, [{ membros: ['', ''] }, { membros: ['', ''] }]);
  assert.equal(form.personalizado, false);
  form.extras.mix.facil = 3;
  assert.equal(PADRAO.mix.facil, 1);
});

test('formDeConfig detecta personalizado e faz ida e volta', () => {
  assert.equal(formDeConfig(valida()).personalizado, false);
  const custom = valida({ voltas: 5 });
  const form = formDeConfig(custom);
  assert.equal(form.personalizado, true);
  assert.deepEqual(montarConfig(form), custom);
});

test('trocarModo reaproveita os nomes', () => {
  const ind = { ...formVazio(), modo: 'individual', times: [{ membros: ['A'] }, { membros: ['B'] }, { membros: ['C'] }] };
  assert.deepEqual(trocarModo(ind, 'duplas').times, [{ membros: ['A', 'B'] }, { membros: ['C', ''] }]);
  const duplas = { ...formVazio(), times: [{ membros: ['A', 'B'] }, { membros: ['C', 'D'] }] };
  assert.deepEqual(trocarModo(duplas, 'individual').times.map((t) => t.membros[0]), ['A', 'B', 'C', 'D']);
  assert.deepEqual(trocarModo(formVazio(), 'individual').times, [{ membros: [''] }, { membros: [''] }]);
  const mesmo = formVazio();
  assert.equal(trocarModo(mesmo, 'duplas'), mesmo);
});

test('lerCaminho / escreverCaminho', () => {
  const o = { mix: { facil: 1 } };
  assert.equal(lerCaminho(o, 'mix.facil'), 1);
  escreverCaminho(o, 'mix.facil', 2);
  assert.equal(o.mix.facil, 2);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../js/config.js'`

- [ ] **Step 3: Implementar `js/config.js`**

```js
import { DIFICULDADES } from './sorteio.js';

export const PADRAO = Object.freeze({
  voltas: 3,
  tempoLeitura: 10,
  tempoMimica: 90,
  mix: Object.freeze({ facil: 1, medio: 1, dificil: 1 }),
  pontos: Object.freeze({ facil: 1, medio: 2, dificil: 3 }),
});

const CAMPOS_EXTRAS = [
  'voltas', 'tempoLeitura', 'tempoMimica',
  'mix.facil', 'mix.medio', 'mix.dificil',
  'pontos.facil', 'pontos.medio', 'pontos.dificil',
];

export const lerCaminho = (obj, caminho) => caminho.split('.').reduce((o, k) => o?.[k], obj);

export function escreverCaminho(obj, caminho, valor) {
  const chaves = caminho.split('.');
  const ultima = chaves.pop();
  chaves.reduce((o, k) => o[k], obj)[ultima] = valor;
}

const fora = (v, min, max) => !Number.isInteger(v) || v < min || v > max;

export function validarConfig(config) {
  const erros = [];
  const duplas = config.modo === 'duplas';
  const times = Array.isArray(config.times) ? config.times : [];
  if (config.modo !== 'duplas' && config.modo !== 'individual') erros.push('Escolha o modo de jogo.');
  if (times.length < 2) erros.push(duplas ? 'Adicione pelo menos 2 duplas.' : 'Adicione pelo menos 2 jogadores.');

  const tamanho = duplas ? 2 : 1;
  const nomes = times.flatMap((t) => t.membros ?? []).map((n) => String(n).trim());
  const incompleto = times.some((t) => (t.membros ?? []).length !== tamanho);
  if (incompleto || nomes.some((n) => n === '')) erros.push('Preencha todos os nomes.');
  const normalizados = nomes.filter(Boolean).map((n) => n.toLocaleLowerCase('pt-BR'));
  if (new Set(normalizados).size !== normalizados.length) erros.push('Há nomes repetidos.');

  if (!Array.isArray(config.temas) || config.temas.length === 0) erros.push('Escolha pelo menos 1 tema.');
  if (fora(config.voltas, 1, 10)) erros.push('Voltas: de 1 a 10.');
  if (fora(config.tempoMimica, 30, 300) || config.tempoMimica % 15 !== 0) erros.push('Tempo de mímica: de 30 s a 5 min, de 15 em 15 s.');
  if (fora(config.tempoLeitura, 5, 30)) erros.push('Tempo de leitura: de 5 a 30 s.');

  const mix = config.mix ?? {};
  if (DIFICULDADES.some((d) => fora(mix[d], 0, 3))) {
    erros.push('Itens por dificuldade: de 0 a 3.');
  } else {
    const total = DIFICULDADES.reduce((soma, d) => soma + mix[d], 0);
    if (total < 1 || total > 6) erros.push('Total de itens por vez: de 1 a 6.');
  }
  const pontos = config.pontos ?? {};
  if (DIFICULDADES.some((d) => fora(pontos[d], 1, 5))) erros.push('Pontos por dificuldade: de 1 a 5.');
  return erros;
}

export function formVazio() {
  return {
    modo: 'duplas',
    times: [{ membros: ['', ''] }, { membros: ['', ''] }],
    temas: [],
    personalizado: false,
    extras: structuredClone(PADRAO),
  };
}

export function formDeConfig(config) {
  const extras = {
    voltas: config.voltas,
    tempoLeitura: config.tempoLeitura,
    tempoMimica: config.tempoMimica,
    mix: { ...config.mix },
    pontos: { ...config.pontos },
  };
  return {
    modo: config.modo,
    times: config.times.map((t) => ({ membros: [...t.membros] })),
    temas: [...config.temas],
    personalizado: CAMPOS_EXTRAS.some((c) => lerCaminho(extras, c) !== lerCaminho(PADRAO, c)),
    extras,
  };
}

export function montarConfig(form) {
  const base = form.personalizado ? form.extras : PADRAO;
  return {
    modo: form.modo,
    times: form.times.map((t) => ({ membros: t.membros.map((n) => n.trim()) })),
    temas: [...form.temas],
    voltas: base.voltas,
    tempoLeitura: base.tempoLeitura,
    tempoMimica: base.tempoMimica,
    mix: { ...base.mix },
    pontos: { ...base.pontos },
  };
}

export function trocarModo(form, modo) {
  if (form.modo === modo) return form;
  const tamanho = modo === 'duplas' ? 2 : 1;
  const nomes = form.times.flatMap((t) => t.membros).filter((n) => n.trim() !== '');
  const times = [];
  for (let i = 0; i < nomes.length; i += tamanho) {
    const membros = nomes.slice(i, i + tamanho);
    while (membros.length < tamanho) membros.push('');
    times.push({ membros });
  }
  while (times.length < 2) times.push({ membros: Array(tamanho).fill('') });
  return { ...form, modo, times };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS (sorteio + config).

- [ ] **Step 5: Commit**

```bash
git add js/config.js test/config.test.js
git commit -m "feat: configuração padrão/personalizada e validação"
```

---

### Task 3: Lógica da partida

**Files:**
- Create: `js/jogo.js`
- Test: `test/jogo.test.js`

**Interfaces:**
- Consumes: `sortearVez` (Task 1), `validarConfig`, `PADRAO` (Task 2).
- Produces:
  - `VERSAO_ESTADO = 1`
  - `Estado = { versao, config, vezIndice, pontos: number[], usados, itensDaVez: Item[]|null, historico: Registro[] }`
  - `Registro = { vezIndice, time, quemFaz, ganhos, itens: (Item & { acertou: boolean, acertouTime: number|null })[] }`
  - `Resultado = { acertou: boolean, acertouTime: number|null }` (um por item de `itensDaVez`, mesma ordem)
  - `criarPartida(config)`, `nomeDoTime(time)`, `vezesPorVolta(config)`, `totalDeVezes(config)`
  - `vezAtual(estado) → { time: number, volta: number, quemFaz: string, quemAdivinha: string|null }`
  - `sortear(estado, temas, rng?) → Estado`, `registrarVez(estado, resultados) → Estado`
  - `terminou(estado): boolean`, `placar(estado) → [{ time, nome, pontos, posicao }]`
  - `retomar(estado) → Estado`, `partidaCompativel(estado, temas): boolean`

- [ ] **Step 1: Escrever os testes que falham — `test/jogo.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PADRAO } from '../js/config.js';
import {
  VERSAO_ESTADO, criarPartida, nomeDoTime, vezesPorVolta, totalDeVezes, vezAtual,
  sortear, registrarVez, terminou, placar, retomar, partidaCompativel,
} from '../js/jogo.js';
import { rngSemente, temaFalso } from './ajuda.js';

const TEMAS = ['a', 'b', 'c'].map((id) => temaFalso(id));
const base = () => ({ temas: ['a', 'b', 'c'], ...structuredClone(PADRAO) });
const individual = (n = 3, extra = {}) => ({
  ...base(), modo: 'individual', voltas: 2,
  times: Array.from({ length: n }, (_, i) => ({ membros: [`J${i + 1}`] })), ...extra,
});
const duplas = (extra = {}) => ({
  ...base(), modo: 'duplas', voltas: 1,
  times: [{ membros: ['Ana', 'Beto'] }, { membros: ['Caio', 'Duda'] }], ...extra,
});
const item = (dificuldade) => ({ temaId: 'a', temaNome: 'A', emoji: '⭐', dificuldade, texto: `x-${dificuldade}` });
const comItens = (estado) => ({ ...estado, itensDaVez: [item('facil'), item('medio'), item('dificil')] });
const acertos = (...flags) => flags.map((f) => (typeof f === 'number' ? { acertou: true, acertouTime: f } : { acertou: f, acertouTime: null }));

test('criarPartida zera tudo', () => {
  const e = criarPartida(duplas());
  assert.equal(e.versao, VERSAO_ESTADO);
  assert.equal(e.vezIndice, 0);
  assert.deepEqual(e.pontos, [0, 0]);
  assert.equal(e.itensDaVez, null);
  assert.deepEqual(e.historico, []);
});

test('nomeDoTime', () => {
  assert.equal(nomeDoTime({ membros: ['Ana', 'Beto'] }), 'Ana & Beto');
  assert.equal(nomeDoTime({ membros: ['Ana'] }), 'Ana');
});

test('individual: ordem cadastrada, volta avança, ninguém fixo adivinhando', () => {
  let e = criarPartida(individual(3));
  const vistas = [];
  for (let i = 0; i < 4; i++) {
    vistas.push(vezAtual(e));
    e = registrarVez(comItens(e), acertos(false, false, false));
  }
  assert.deepEqual(vistas.map((v) => v.quemFaz), ['J1', 'J2', 'J3', 'J1']);
  assert.deepEqual(vistas.map((v) => v.volta), [1, 1, 1, 2]);
  assert.ok(vistas.every((v) => v.quemAdivinha === null));
  assert.equal(vezesPorVolta(individual(3)), 3);
  assert.equal(totalDeVezes(individual(3)), 6);
});

test('duplas: alterna duplas e inverte quem faz', () => {
  let e = criarPartida(duplas());
  const vistas = [];
  for (let i = 0; i < 4; i++) {
    vistas.push(vezAtual(e));
    e = registrarVez(comItens(e), acertos(false, false, false));
  }
  assert.deepEqual(vistas.map((v) => [v.time, v.quemFaz, v.quemAdivinha]), [
    [0, 'Ana', 'Beto'], [1, 'Caio', 'Duda'], [0, 'Beto', 'Ana'], [1, 'Duda', 'Caio'],
  ]);
  assert.ok(vistas.every((v) => v.volta === 1));
  assert.equal(vezesPorVolta(duplas()), 4);
  assert.equal(terminou(e), true);
});

test('duplas: pontos vão para a dupla de quem fez', () => {
  const e = registrarVez(comItens(criarPartida(duplas())), acertos(true, false, true));
  assert.deepEqual(e.pontos, [4, 0]);
  const reg = e.historico.at(-1);
  assert.equal(reg.ganhos, 4);
  assert.equal(reg.quemFaz, 'Ana');
  assert.deepEqual(reg.itens.map((i) => i.acertou), [true, false, true]);
  assert.equal(e.itensDaVez, null);
  assert.equal(e.vezIndice, 1);
});

test('individual: quem fez e quem acertou pontuam', () => {
  const e = registrarVez(comItens(criarPartida(individual(3))), [
    { acertou: false, acertouTime: null },
    { acertou: true, acertouTime: 2 },
    { acertou: false, acertouTime: null },
  ]);
  assert.deepEqual(e.pontos, [2, 0, 2]);
  assert.equal(e.historico.at(-1).itens[1].acertouTime, 2);
});

test('individual: acertouTime igual a quem fez conta uma vez só', () => {
  const e = registrarVez(comItens(criarPartida(individual(2))), acertos(0, false, false));
  assert.deepEqual(e.pontos, [1, 0]);
});

test('pontos personalizados', () => {
  const e = registrarVez(comItens(criarPartida(duplas({ pontos: { facil: 2, medio: 4, dificil: 5 } }))), acertos(true, true, true));
  assert.deepEqual(e.pontos, [11, 0]);
});

test('registrarVez sem sorteio lança erro', () => {
  assert.throws(() => registrarVez(criarPartida(duplas()), []), /Nenhum item sorteado/);
});

test('sortear preenche itensDaVez e usados', () => {
  const e = sortear(criarPartida(duplas()), TEMAS, rngSemente(1));
  assert.equal(e.itensDaVez.length, 3);
  assert.equal(Object.values(e.usados).flat().length, 3);
});

test('placar ordenado com empate dividindo posição', () => {
  const e = { ...criarPartida(individual(3)), pontos: [3, 5, 3] };
  assert.deepEqual(placar(e).map((l) => [l.nome, l.pontos, l.posicao]), [['J2', 5, 1], ['J1', 3, 2], ['J3', 3, 2]]);
});

test('estado sobrevive a JSON', () => {
  const e = sortear(criarPartida(duplas()), TEMAS, rngSemente(2));
  const copia = JSON.parse(JSON.stringify(e));
  assert.deepEqual(copia, e);
  assert.deepEqual(vezAtual(copia), vezAtual(e));
});

test('retomar descarta os itens da vez em andamento', () => {
  const e = retomar(sortear(criarPartida(duplas()), TEMAS, rngSemente(3)));
  assert.equal(e.itensDaVez, null);
  assert.equal(Object.values(e.usados).flat().length, 3);
});

test('partidaCompativel rejeita estado inválido', () => {
  const ok = criarPartida(duplas());
  assert.equal(partidaCompativel(ok, TEMAS), true);
  assert.equal(partidaCompativel(null, TEMAS), false);
  assert.equal(partidaCompativel({ ...ok, versao: 99 }, TEMAS), false);
  assert.equal(partidaCompativel({ ...ok, pontos: [0] }, TEMAS), false);
  assert.equal(partidaCompativel({ ...ok, vezIndice: 'x' }, TEMAS), false);
  assert.equal(partidaCompativel(criarPartida(duplas({ temas: ['sumiu'] })), TEMAS), false);
  assert.equal(partidaCompativel({ ...ok, config: { ...ok.config, times: [] } }, TEMAS), false);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../js/jogo.js'`

- [ ] **Step 3: Implementar `js/jogo.js`**

```js
import { sortearVez } from './sorteio.js';
import { validarConfig } from './config.js';

export const VERSAO_ESTADO = 1;

export function criarPartida(config) {
  return {
    versao: VERSAO_ESTADO,
    config,
    vezIndice: 0,
    pontos: config.times.map(() => 0),
    usados: {},
    itensDaVez: null,
    historico: [],
  };
}

export const nomeDoTime = (time) => time.membros.join(' & ');

const tamanhoDoTime = (config) => (config.modo === 'duplas' ? 2 : 1);
export const vezesPorVolta = (config) => config.times.length * tamanhoDoTime(config);
export const totalDeVezes = (config) => vezesPorVolta(config) * config.voltas;

// Os times jogam em rodízio; dentro do time, quem faz alterna a cada vez dele.
export function vezAtual(estado) {
  const { config, vezIndice } = estado;
  const time = vezIndice % config.times.length;
  const jogadasDoTime = Math.floor(vezIndice / config.times.length);
  const membros = config.times[time].membros;
  return {
    time,
    volta: Math.floor(vezIndice / vezesPorVolta(config)) + 1,
    quemFaz: membros[jogadasDoTime % membros.length],
    quemAdivinha: config.modo === 'duplas' ? membros[(jogadasDoTime + 1) % membros.length] : null,
  };
}

export function sortear(estado, temas, rng = Math.random) {
  const { itens, usados } = sortearVez({
    temas,
    temasEscolhidos: estado.config.temas,
    mix: estado.config.mix,
    usados: estado.usados,
    rng,
  });
  return { ...estado, usados, itensDaVez: itens };
}

export function registrarVez(estado, resultados) {
  if (!estado.itensDaVez) throw new Error('Nenhum item sorteado nesta vez.');
  const { config } = estado;
  const vez = vezAtual(estado);
  const pontos = [...estado.pontos];
  let ganhos = 0;

  const itens = estado.itensDaVez.map((item, i) => {
    const acertou = Boolean(resultados[i]?.acertou);
    const acertouTime = acertou ? (resultados[i].acertouTime ?? null) : null;
    if (acertou) {
      const valor = config.pontos[item.dificuldade];
      pontos[vez.time] += valor;
      ganhos += valor;
      if (config.modo === 'individual' && acertouTime !== null && acertouTime !== vez.time) {
        pontos[acertouTime] += valor;
      }
    }
    return { ...item, acertou, acertouTime };
  });

  return {
    ...estado,
    pontos,
    vezIndice: estado.vezIndice + 1,
    itensDaVez: null,
    historico: [...estado.historico, { vezIndice: estado.vezIndice, time: vez.time, quemFaz: vez.quemFaz, ganhos, itens }],
  };
}

export const terminou = (estado) => estado.vezIndice >= totalDeVezes(estado.config);

export function placar(estado) {
  const linhas = estado.config.times
    .map((time, i) => ({ time: i, nome: nomeDoTime(time), pontos: estado.pontos[i] }))
    .sort((a, b) => b.pontos - a.pontos);
  let posicao = 0;
  return linhas.map((linha, i) => {
    if (i === 0 || linha.pontos < linhas[i - 1].pontos) posicao = i + 1;
    return { ...linha, posicao };
  });
}

// Ao retomar, a vez em andamento recomeça do sorteio (o cronômetro não sobrevive).
export const retomar = (estado) => ({ ...estado, itensDaVez: null });

export function partidaCompativel(estado, temas) {
  return Boolean(
    estado
    && estado.versao === VERSAO_ESTADO
    && estado.config
    && validarConfig(estado.config).length === 0
    && estado.config.temas.every((id) => temas.some((t) => t.id === id))
    && Array.isArray(estado.pontos)
    && estado.pontos.length === estado.config.times.length
    && Number.isInteger(estado.vezIndice),
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS (sorteio + config + jogo).

- [ ] **Step 5: Commit**

```bash
git add js/jogo.js test/jogo.test.js
git commit -m "feat: lógica da partida (rodízio, pontuação, placar)"
```

---

### Task 4: Utilitários (tempo, armazenamento, HTML seguro)

**Files:**
- Create: `js/tempo.js`, `js/armazenamento.js`, `js/dom.js`
- Test: `test/tempo.test.js`, `test/armazenamento.test.js`, `test/dom.test.js`

**Interfaces:**
- Produces:
  - `formatarTempo(segundos): string` → `"1:30"`, arredonda para cima, nunca negativo
  - `iniciarCronometro(duracaoSeg, { aoTick(restanteSeg), aoFim(), agora?, intervalo? }) → parar()`
  - `criarArmazenamento(storage|null) → { carregarPartida, salvarPartida, limparPartida, carregarConfig, salvarConfig }`
  - `esc(texto)`, `ROTULO_DIFICULDADE`, `itemHtml(item, { extra?, acertou?, nota?, animar? })`, `placarHtml(linhas)`, `ligar(el, acoes)`

- [ ] **Step 1: Escrever os testes que falham**

`test/tempo.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarTempo, iniciarCronometro } from '../js/tempo.js';

test('formatarTempo', () => {
  assert.equal(formatarTempo(90), '1:30');
  assert.equal(formatarTempo(5), '0:05');
  assert.equal(formatarTempo(59.2), '1:00');
  assert.equal(formatarTempo(-3), '0:00');
  assert.equal(formatarTempo(300), '5:00');
});

test('iniciarCronometro segue o relógio mesmo após ficar em segundo plano', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let agora = 0;
  const ticks = [];
  let fins = 0;
  const parar = iniciarCronometro(90, { agora: () => agora, aoTick: (r) => ticks.push(r), aoFim: () => fins++ });
  assert.equal(ticks.at(-1), 90);
  agora = 60_000;
  t.mock.timers.tick(200);
  assert.equal(ticks.at(-1), 30);
  agora = 95_000;
  t.mock.timers.tick(200);
  assert.equal(ticks.at(-1), 0);
  assert.equal(fins, 1);
  t.mock.timers.tick(1000);
  assert.equal(fins, 1);
  parar();
});

test('parar interrompe o cronômetro', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let agora = 0;
  let ticks = 0;
  const parar = iniciarCronometro(10, { agora: () => agora, aoTick: () => ticks++, aoFim: () => {} });
  parar();
  agora = 5000;
  t.mock.timers.tick(1000);
  assert.equal(ticks, 1);
});
```

`test/armazenamento.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarArmazenamento } from '../js/armazenamento.js';

function storageFalso() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test('salva, carrega e limpa', () => {
  const a = criarArmazenamento(storageFalso());
  a.salvarPartida({ x: 1 });
  a.salvarConfig({ y: 2 });
  assert.deepEqual(a.carregarPartida(), { x: 1 });
  assert.deepEqual(a.carregarConfig(), { y: 2 });
  a.limparPartida();
  assert.equal(a.carregarPartida(), null);
  assert.deepEqual(a.carregarConfig(), { y: 2 });
});

test('JSON corrompido vira null', () => {
  const s = storageFalso();
  s.setItem('mimica:partida', '{quebrado');
  assert.equal(criarArmazenamento(s).carregarPartida(), null);
});

test('sem storage ou storage que lança não quebra', () => {
  const nulo = criarArmazenamento(null);
  nulo.salvarPartida({ x: 1 });
  assert.equal(nulo.carregarPartida(), null);
  const explode = () => { throw new Error('bloqueado'); };
  const ruim = criarArmazenamento({ getItem: explode, setItem: explode, removeItem: explode });
  ruim.salvarPartida({ x: 1 });
  ruim.limparPartida();
  assert.equal(ruim.carregarPartida(), null);
});
```

`test/dom.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, itemHtml, placarHtml } from '../js/dom.js';

const MAL = '<img src=x onerror=alert(1)>';

test('esc', () => {
  assert.equal(esc(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(esc(3), '3');
});

test('itemHtml escapa texto, tema e nota', () => {
  const html = itemHtml({ temaId: 'a', temaNome: MAL, emoji: MAL, dificuldade: 'facil', texto: MAL }, { nota: MAL });
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('data-dificuldade="facil"'));
  assert.ok(html.includes('Fácil'));
});

test('itemHtml marca acertou', () => {
  const html = itemHtml({ temaId: 'a', temaNome: 'A', emoji: '⭐', dificuldade: 'medio', texto: 't' }, { acertou: true });
  assert.ok(html.includes('item acertou'));
});

test('placarHtml escapa nomes', () => {
  const html = placarHtml([{ time: 0, nome: MAL, pontos: 3, posicao: 1 }]);
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('1º'));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — módulos `tempo.js`, `armazenamento.js`, `dom.js` não encontrados.

- [ ] **Step 3: Implementar `js/tempo.js`**

```js
export function formatarTempo(segundos) {
  const s = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Calcula o restante pelo relógio (não conta ticks): não atrasa em segundo plano.
export function iniciarCronometro(duracaoSeg, { aoTick, aoFim, agora = () => Date.now(), intervalo = 200 }) {
  const fim = agora() + duracaoSeg * 1000;
  let parado = false;
  const id = setInterval(() => tick(), intervalo);
  const parar = () => {
    parado = true;
    clearInterval(id);
  };
  function tick() {
    if (parado) return;
    const restante = Math.max(0, (fim - agora()) / 1000);
    aoTick(restante);
    if (restante <= 0) {
      parar();
      aoFim();
    }
  }
  tick();
  return parar;
}
```

- [ ] **Step 4: Implementar `js/armazenamento.js`**

```js
const CHAVE_PARTIDA = 'mimica:partida';
const CHAVE_CONFIG = 'mimica:config';

export function criarArmazenamento(storage) {
  const ler = (chave) => {
    try {
      const texto = storage?.getItem(chave);
      return texto ? JSON.parse(texto) : null;
    } catch {
      return null;
    }
  };
  const gravar = (chave, valor) => {
    try {
      if (valor == null) storage?.removeItem(chave);
      else storage?.setItem(chave, JSON.stringify(valor));
    } catch {
      // sem storage o jogo segue, só não retoma
    }
  };
  return {
    carregarPartida: () => ler(CHAVE_PARTIDA),
    salvarPartida: (estado) => gravar(CHAVE_PARTIDA, estado),
    limparPartida: () => gravar(CHAVE_PARTIDA, null),
    carregarConfig: () => ler(CHAVE_CONFIG),
    salvarConfig: (config) => gravar(CHAVE_CONFIG, config),
  };
}
```

- [ ] **Step 5: Implementar `js/dom.js`**

```js
export const ROTULO_DIFICULDADE = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (texto) => String(texto).replace(/[&<>"']/g, (c) => ENTIDADES[c]);

// `extra` é HTML confiável montado pela tela; `nota` é texto e é escapado aqui.
export function itemHtml(item, { extra = '', acertou = false, nota = '', animar = true } = {}) {
  const classes = ['item', acertou && 'acertou', animar && 'entrar'].filter(Boolean).join(' ');
  return `
    <div class="${classes}" data-dificuldade="${esc(item.dificuldade)}">
      <div class="item-corpo">
        <div class="meta">${esc(item.emoji)} ${esc(item.temaNome)} · <span class="selo">${ROTULO_DIFICULDADE[item.dificuldade]}</span>${nota ? ` <span class="nota">${esc(nota)}</span>` : ''}</div>
        <div class="texto">${esc(item.texto)}</div>
      </div>
      ${extra}
    </div>`;
}

export function placarHtml(linhas) {
  return `<ol class="placar">${linhas
    .map((l) => `<li><span>${l.posicao}º ${esc(l.nome)}</span><b>${l.pontos}</b></li>`)
    .join('')}</ol>`;
}

// Delegação de clique: <button data-acao="x"> chama acoes.x(botao, evento).
export function ligar(el, acoes) {
  el.addEventListener('click', (ev) => {
    const alvo = ev.target.closest('[data-acao]');
    if (alvo && el.contains(alvo) && !alvo.disabled && acoes[alvo.dataset.acao]) {
      acoes[alvo.dataset.acao](alvo, ev);
    }
  });
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test`
Expected: PASS (todos).

- [ ] **Step 7: Commit**

```bash
git add js/tempo.js js/armazenamento.js js/dom.js test/tempo.test.js test/armazenamento.test.js test/dom.test.js
git commit -m "feat: cronômetro, persistência e helpers de HTML seguro"
```

---

### Task 5: Conteúdo dos temas

**Files:**
- Create: `data/temas.json`
- Test: `test/temas.test.js`

**Interfaces:**
- Produces: array de `Tema` (formato da Task 1) com ids, nesta ordem: `filmes-series`, `profissao`, `animal`, `esportes`, `futebol`, `dia-a-dia`, `famosos`.

Diretrizes de conteúdo (pt-BR, conhecido por brasileiros, encenável em mímica):
- **Fácil:** reconhecível de imediato, mas nunca trivial demais (no Futebol, nada de "chutar", "cabecear", "carrinho").
- **Médio:** exige 2–3 gestos ou contexto.
- **Difícil:** conceito composto ou abstrato que exige criatividade.
- Mínimo 20 itens por dificuldade em cada tema; sem duplicatas dentro do tema; capitalização só na primeira letra (salvo nomes próprios).
- Esportes não inclui futebol de campo.
- Futebol mistura jogadores, fundamentos, táticas e coisas do futebol.

- [ ] **Step 1: Escrever o teste que falha — `test/temas.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const temas = JSON.parse(readFileSync(new URL('../data/temas.json', import.meta.url), 'utf8'));
const porId = Object.fromEntries(temas.map((t) => [t.id, t]));
const contem = (id, dificuldade, ...textos) => {
  for (const texto of textos) assert.ok(porId[id].itens[dificuldade].includes(texto), `${id}/${dificuldade} sem "${texto}"`);
};

test('sete temas na ordem certa', () => {
  assert.deepEqual(temas.map((t) => t.id), ['filmes-series', 'profissao', 'animal', 'esportes', 'futebol', 'dia-a-dia', 'famosos']);
});

test('cada tema: nome, emoji e 20+ itens por dificuldade sem repetição', () => {
  for (const t of temas) {
    assert.ok(t.nome.trim() && t.emoji.trim(), t.id);
    const todos = [];
    for (const d of ['facil', 'medio', 'dificil']) {
      assert.ok(t.itens[d].length >= 20, `${t.id}/${d} tem ${t.itens[d].length}`);
      for (const texto of t.itens[d]) {
        assert.equal(typeof texto, 'string');
        assert.equal(texto, texto.trim());
        assert.ok(texto.length > 0);
      }
      todos.push(...t.itens[d]);
    }
    const norm = todos.map((x) => x.toLocaleLowerCase('pt-BR'));
    assert.equal(new Set(norm).size, norm.length, `${t.id} tem item repetido`);
  }
});

test('futebol: exemplos pedidos e nada óbvio demais', () => {
  contem('futebol', 'facil', 'Marcação');
  contem('futebol', 'medio', 'Caneta', 'Tesoura', 'Pressionar');
  contem('futebol', 'dificil', 'Marcação por zona', 'Finalizar no ângulo', 'Campeonato Brasileiro');
  const todos = Object.values(porId.futebol.itens).flat().map((x) => x.toLowerCase());
  for (const proibido of ['cabecear', 'carrinho', 'chutar']) assert.ok(!todos.includes(proibido), proibido);
});

test('ações do dia a dia: exemplos pedidos', () => {
  contem('dia-a-dia', 'facil', 'Escovar os dentes', 'Lavar louça');
  contem('dia-a-dia', 'medio', 'Perder o ônibus', 'Procurar a chave', 'Pisar em Lego');
  contem('dia-a-dia', 'dificil', 'Montar móvel sem manual');
});

test('famosos: exemplos pedidos', () => {
  contem('famosos', 'facil', 'Neymar', 'Xuxa', 'Silvio Santos');
  contem('famosos', 'medio', 'Anitta', 'Faustão', 'Ayrton Senna');
  contem('famosos', 'dificil', 'Einstein', 'Chaves', 'Gretchen');
});

test('esportes não tem futebol de campo', () => {
  const todos = Object.values(porId.esportes.itens).flat().map((x) => x.toLowerCase());
  assert.ok(todos.every((x) => !x.includes('futebol') || x.includes('americano')));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `ENOENT ... data/temas.json`

- [ ] **Step 3: Escrever `data/temas.json`**

Estrutura (preencher todas as listas seguindo as diretrizes acima; os exemplos obrigatórios do teste precisam estar presentes):

```json
[
  { "id": "filmes-series", "nome": "Filmes/Séries", "emoji": "🎬", "itens": { "facil": [], "medio": [], "dificil": [] } },
  { "id": "profissao", "nome": "Profissão", "emoji": "👷", "itens": { "facil": [], "medio": [], "dificil": [] } },
  { "id": "animal", "nome": "Animal", "emoji": "🐾", "itens": { "facil": [], "medio": [], "dificil": [] } },
  { "id": "esportes", "nome": "Esportes", "emoji": "🏅", "itens": { "facil": [], "medio": [], "dificil": [] } },
  { "id": "futebol", "nome": "Futebol", "emoji": "⚽", "itens": { "facil": [], "medio": [], "dificil": [] } },
  { "id": "dia-a-dia", "nome": "Ações do dia a dia", "emoji": "🏠", "itens": { "facil": [], "medio": [], "dificil": [] } },
  { "id": "famosos", "nome": "Famosos", "emoji": "⭐", "itens": { "facil": [], "medio": [], "dificil": [] } }
]
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add data/temas.json test/temas.test.js
git commit -m "feat: conteúdo dos 7 temas"
```

---

### Task 6: Casca do app (HTML, CSS, roteador, telas simples)

**Files:**
- Create: `index.html`, `css/style.css`, `js/app.js`, `js/efeitos.js`
- Create: `js/telas/inicio.js`, `js/telas/comoJogar.js`, `js/telas/erro.js`
- Create (temporários, substituídos nas Tasks 7–8): `js/telas/configuracao.js`, `js/telas/vez.js`, `js/telas/leitura.js`, `js/telas/mimica.js`, `js/telas/resultado.js`, `js/telas/final.js`

**Interfaces:**
- Consumes: tudo das Tasks 1–5.
- Produces:
  - Contrato de tela: `tela(el: HTMLElement, props) → (() => void) | undefined` (retorno opcional = limpeza)
  - `efeitos.js`: `manterTelaAcesa()`, `liberarTela()`, `vibrar(padrao)`, `bip({ frequencia?, duracao?, vezes? })`, `desbloquearAudio()`
  - Props que `app.js` passa para cada tela (as Tasks 7–8 implementam exatamente estas):
    - `telaConfiguracao(el, { temas, configSalva, aoVoltar, aoComecar(config) })`
    - `telaVez(el, { vez, modo, totalVoltas, placar, aoSortear, aoSair })`
    - `telaLeitura(el, { itens, segundos, aoFim })`
    - `telaMimica(el, { itens, segundos, modo, jogadores: [{ time, nome }], aoTerminar(resultados) })`
    - `telaResultado(el, { registro, placar, ultimaVez, nomeQuemAcertou(time), aoProximo })`
    - `telaFinal(el, { placar, aoJogarDeNovo, aoInicio })`

- [ ] **Step 1: `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#6d28d9">
  <meta name="description" content="Sorteia itens de mímica por tema e dificuldade, marca o tempo e soma os pontos.">
  <title>Sorteia Mímica</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <main id="app" class="app" aria-live="polite"></main>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: `css/style.css`**

```css
:root {
  --bg: #f6f3ff;
  --surface: #ffffff;
  --surface-2: #efe9ff;
  --text: #1d1530;
  --muted: #6b6280;
  --primary: #6d28d9;
  --primary-text: #ffffff;
  --border: #ddd3f5;
  --facil: #15803d;
  --medio: #b45309;
  --dificil: #dc2626;
  --facil-bg: #dcfce7;
  --medio-bg: #fef3c7;
  --dificil-bg: #fee2e2;
  --radius: 16px;
  --shadow: 0 4px 16px rgb(60 30 120 / 0.10);
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #120d1f;
    --surface: #1d1630;
    --surface-2: #2a2145;
    --text: #f3efff;
    --muted: #a79fc0;
    --primary: #8b5cf6;
    --border: #3a2f5c;
    --facil: #4ade80;
    --medio: #fbbf24;
    --dificil: #f87171;
    --facil-bg: #14321f;
    --medio-bg: #3a2c0c;
    --dificil-bg: #3d1515;
    --shadow: none;
    color-scheme: dark;
  }
}

* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 17px;
  line-height: 1.4;
  -webkit-tap-highlight-color: transparent;
}

.app {
  max-width: 520px;
  margin: 0 auto;
  min-height: 100dvh;
  padding: max(16px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}
.tela { flex: 1; display: flex; flex-direction: column; gap: 16px; }

h1 { font-size: 1.9rem; margin: 0; line-height: 1.15; }
h2 { font-size: 1.15rem; margin: 0 0 10px; }
.muted { color: var(--muted); }
.centro { text-align: center; }

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow);
}
.capa { text-align: center; }
.capa .emoji { font-size: 4rem; line-height: 1; margin-bottom: 8px; }
.inicio .capa { margin-top: 10vh; background: none; border: 0; box-shadow: none; }

.btn {
  appearance: none;
  border: 0;
  border-radius: 14px;
  padding: 16px 20px;
  min-height: 56px;
  width: 100%;
  font: inherit;
  font-weight: 700;
  font-size: 1.1rem;
  background: var(--surface-2);
  color: var(--text);
  cursor: pointer;
}
.btn-primario { background: var(--primary); color: var(--primary-text); }
.btn-pequeno { min-height: 44px; padding: 8px 14px; font-size: .95rem; width: auto; }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn:active:not(:disabled) { transform: scale(.98); }
.rodape { margin-top: auto; display: flex; flex-direction: column; gap: 10px; padding-top: 8px; }

.linha { display: flex; gap: 8px; align-items: center; }
.entre { justify-content: space-between; }
.dupla + .dupla, .linha + .linha { margin-top: 10px; }
.dupla .muted { font-size: .85rem; margin-bottom: 4px; }

.segmentado {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: var(--surface-2);
  padding: 4px;
  border-radius: 14px;
}
.segmentado button {
  border: 0;
  background: transparent;
  padding: 12px;
  border-radius: 10px;
  font: inherit;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
}
.segmentado button[aria-pressed="true"] { background: var(--surface); color: var(--text); box-shadow: var(--shadow); }

.campo {
  flex: 1;
  min-width: 0;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font: inherit;
}
.campo:focus { outline: 2px solid var(--primary); outline-offset: 1px; }

.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--text);
  border-radius: 999px;
  padding: 10px 14px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.chip[aria-pressed="true"] { border-color: var(--primary); background: var(--surface-2); }

.stepper { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0; }
.stepper .valor { min-width: 64px; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
.stepper button {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 0;
  background: var(--surface-2);
  color: var(--text);
  font-size: 1.4rem;
  cursor: pointer;
}

.erros { color: var(--dificil); margin: 0; padding-left: 20px; font-size: .95rem; }
.erros:empty { display: none; }

.lista-itens { display: flex; flex-direction: column; gap: 10px; }
.item {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  border-left: 6px solid var(--cor);
  background: var(--surface);
  border-radius: var(--radius);
  padding: 14px 16px;
  box-shadow: var(--shadow);
}
.item[data-dificuldade="facil"] { --cor: var(--facil); --cor-bg: var(--facil-bg); }
.item[data-dificuldade="medio"] { --cor: var(--medio); --cor-bg: var(--medio-bg); }
.item[data-dificuldade="dificil"] { --cor: var(--dificil); --cor-bg: var(--dificil-bg); }
.item.acertou { background: var(--cor-bg); }
.item-corpo { flex: 1; min-width: 0; }
.item .meta { font-size: .85rem; color: var(--muted); }
.item .texto { font-size: 1.35rem; font-weight: 800; overflow-wrap: anywhere; }
.selo {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--cor-bg);
  color: var(--cor);
  font-weight: 700;
  font-size: .8rem;
}
.check {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid var(--cor);
  background: transparent;
  color: var(--cor);
  font-size: 1.5rem;
  font-weight: 800;
  cursor: pointer;
  flex-shrink: 0;
}
.item.acertou .check { background: var(--cor); color: #fff; }
.marca { font-size: 1.4rem; font-weight: 800; color: var(--cor); }
.escolher-quem { flex-basis: 100%; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }

.cronometro {
  font-size: 4.5rem;
  font-weight: 800;
  text-align: center;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.cronometro.alerta { color: var(--dificil); animation: pulsar 1s infinite; }
.barra { height: 8px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
.barra > div { height: 100%; background: var(--primary); transition: width .2s linear; }

.placar { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.placar li { display: flex; justify-content: space-between; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); }
.placar li:last-child { border-bottom: 0; }
.placar.final li { font-size: 1.2rem; padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
.destaque { font-size: 1.8rem; font-weight: 800; }
.vez b { color: var(--primary); }
.lista { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px; }

.entrar { animation: entrar .35s ease-out both; }
@keyframes entrar { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes pulsar { 50% { opacity: .55; } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 3: `js/efeitos.js`**

```js
let wakeLock = null;
let querTelaAcesa = false;
let audio = null;

export async function manterTelaAcesa() {
  querTelaAcesa = true;
  try {
    wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
  } catch {
    wakeLock = null;
  }
}

export function liberarTela() {
  querTelaAcesa = false;
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}

// O navegador solta o wake lock quando a aba some; pede de novo ao voltar.
document.addEventListener('visibilitychange', () => {
  if (querTelaAcesa && document.visibilityState === 'visible') manterTelaAcesa();
});

export function vibrar(padrao) {
  try {
    navigator.vibrate?.(padrao);
  } catch {
    // sem vibração
  }
}

// iOS só libera áudio criado/retomado dentro de um toque do usuário.
export function desbloquearAudio() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume?.();
  } catch {
    audio = null;
  }
}

export function bip({ frequencia = 880, duracao = 0.15, vezes = 1 } = {}) {
  if (!audio) return;
  try {
    for (let i = 0; i < vezes; i++) {
      const inicio = audio.currentTime + i * (duracao + 0.08);
      const osc = audio.createOscillator();
      const ganho = audio.createGain();
      osc.frequency.value = frequencia;
      ganho.gain.setValueAtTime(0.2, inicio);
      ganho.gain.exponentialRampToValueAtTime(0.001, inicio + duracao);
      osc.connect(ganho).connect(audio.destination);
      osc.start(inicio);
      osc.stop(inicio + duracao);
    }
  } catch {
    // sem som
  }
}
```

- [ ] **Step 4: Telas simples**

`js/telas/inicio.js`:
```js
import { ligar } from '../dom.js';

export function telaInicio(el, { temPartidaSalva, aoJogar, aoContinuar, aoComoJogar }) {
  el.classList.add('inicio');
  el.innerHTML = `
    <header class="card capa entrar">
      <div class="emoji">🎭</div>
      <h1>Sorteia Mímica</h1>
      <p class="muted">Sorteie, encene e some os pontos.</p>
    </header>
    <div class="rodape">
      ${temPartidaSalva ? '<button class="btn btn-primario" data-acao="continuar">Continuar partida</button>' : ''}
      <button class="btn ${temPartidaSalva ? '' : 'btn-primario'}" data-acao="jogar">${temPartidaSalva ? 'Nova partida' : 'Jogar'}</button>
      <button class="btn" data-acao="como">Como jogar</button>
    </div>`;
  ligar(el, { jogar: aoJogar, continuar: aoContinuar, como: aoComoJogar });
}
```

`js/telas/comoJogar.js`:
```js
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
```

`js/telas/erro.js`:
```js
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
```

Placeholders temporários (um por arquivo; Tasks 7–8 substituem): `js/telas/configuracao.js`, `vez.js`, `leitura.js`, `mimica.js`, `resultado.js`, `final.js`, cada um exportando a função com o nome da interface acima e o corpo:
```js
export function telaConfiguracao(el) {
  el.innerHTML = '<p class="muted">Em construção.</p>';
}
```
(trocando `telaConfiguracao` por `telaVez`, `telaLeitura`, `telaMimica`, `telaResultado`, `telaFinal`.)

- [ ] **Step 5: `js/app.js`**

```js
import { criarArmazenamento } from './armazenamento.js';
import {
  criarPartida, vezAtual, sortear, registrarVez, terminou, placar, nomeDoTime, retomar, partidaCompativel,
} from './jogo.js';
import { manterTelaAcesa, liberarTela, desbloquearAudio } from './efeitos.js';
import { telaInicio } from './telas/inicio.js';
import { telaComoJogar } from './telas/comoJogar.js';
import { telaErro } from './telas/erro.js';
import { telaConfiguracao } from './telas/configuracao.js';
import { telaVez } from './telas/vez.js';
import { telaLeitura } from './telas/leitura.js';
import { telaMimica } from './telas/mimica.js';
import { telaResultado } from './telas/resultado.js';
import { telaFinal } from './telas/final.js';

const raiz = document.getElementById('app');
let storage = null;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}
const armazenamento = criarArmazenamento(storage);

let temas = [];
let estado = null;
let limparTela = null;

function mostrar(tela, props) {
  limparTela?.();
  const el = document.createElement('section');
  el.className = 'tela';
  raiz.replaceChildren(el);
  limparTela = tela(el, props) ?? null;
  window.scrollTo(0, 0);
}

function atualizar(novo) {
  estado = novo;
  armazenamento.salvarPartida(estado);
}

function partidaSalva() {
  const salvo = armazenamento.carregarPartida();
  return partidaCompativel(salvo, temas) ? salvo : null;
}

function irInicio() {
  liberarTela();
  mostrar(telaInicio, {
    temPartidaSalva: Boolean(partidaSalva()),
    aoJogar: irConfiguracao,
    aoComoJogar: () => mostrar(telaComoJogar, { aoVoltar: irInicio }),
    aoContinuar: () => {
      const salvo = partidaSalva();
      if (!salvo) return irInicio();
      atualizar(retomar(salvo));
      irVez();
    },
  });
}

function irConfiguracao() {
  mostrar(telaConfiguracao, {
    temas,
    configSalva: armazenamento.carregarConfig(),
    aoVoltar: irInicio,
    aoComecar: (config) => {
      armazenamento.salvarConfig(config);
      atualizar(criarPartida(config));
      irVez();
    },
  });
}

function irVez() {
  if (terminou(estado)) return irFinal();
  mostrar(telaVez, {
    vez: vezAtual(estado),
    modo: estado.config.modo,
    totalVoltas: estado.config.voltas,
    placar: placar(estado),
    aoSair: irInicio,
    aoSortear: () => {
      desbloquearAudio();
      manterTelaAcesa();
      atualizar(sortear(estado, temas));
      irLeitura();
    },
  });
}

function irLeitura() {
  mostrar(telaLeitura, { itens: estado.itensDaVez, segundos: estado.config.tempoLeitura, aoFim: irMimica });
}

function irMimica() {
  const vez = vezAtual(estado);
  const jogadores = estado.config.times
    .map((time, i) => ({ time: i, nome: nomeDoTime(time) }))
    .filter((j) => j.time !== vez.time);
  mostrar(telaMimica, {
    itens: estado.itensDaVez,
    segundos: estado.config.tempoMimica,
    modo: estado.config.modo,
    jogadores,
    aoTerminar: (resultados) => {
      liberarTela();
      atualizar(registrarVez(estado, resultados));
      irResultado();
    },
  });
}

function irResultado() {
  mostrar(telaResultado, {
    registro: estado.historico.at(-1),
    placar: placar(estado),
    ultimaVez: terminou(estado),
    nomeQuemAcertou: (time) => nomeDoTime(estado.config.times[time]),
    aoProximo: irVez,
  });
}

function irFinal() {
  armazenamento.limparPartida();
  mostrar(telaFinal, {
    placar: placar(estado),
    aoInicio: irInicio,
    aoJogarDeNovo: () => {
      atualizar(criarPartida(estado.config));
      irVez();
    },
  });
}

async function iniciar() {
  raiz.innerHTML = '<p class="muted centro">Carregando…</p>';
  try {
    const resposta = await fetch('data/temas.json');
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    temas = await resposta.json();
    irInicio();
  } catch {
    mostrar(telaErro, { mensagem: 'Não foi possível carregar os temas.', aoTentar: iniciar });
  }
}

iniciar();
```

- [ ] **Step 6: Verificar no navegador**

Run (em background): `python3 -m http.server 8123 --bind 127.0.0.1`
Abrir `http://127.0.0.1:8123/` com Playwright em viewport 390×844.
Expected:
- Início mostra 🎭, "Sorteia Mímica", botões "Jogar" e "Como jogar"; sem erros no console.
- "Como jogar" abre e "Voltar" retorna.
- "Jogar" mostra "Em construção.".
- Renomeando `data/temas.json` temporariamente → tela de erro com "Tentar de novo"; restaurar o arquivo.
- `npm test` continua PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html css js
git commit -m "feat: casca do app, roteador e telas de início"
```

---

### Task 7: Tela de configuração

**Files:**
- Modify (substituir inteiro): `js/telas/configuracao.js`

**Interfaces:**
- Consumes: `PADRAO`, `validarConfig`, `montarConfig`, `formVazio`, `formDeConfig`, `trocarModo`, `lerCaminho`, `escreverCaminho` (Task 2); `esc`, `ligar` (Task 4); `formatarTempo` (Task 4).
- Produces: `telaConfiguracao(el, { temas, configSalva, aoVoltar, aoComecar(config) })`.

- [ ] **Step 1: Implementar `js/telas/configuracao.js`**

```js
import {
  PADRAO, validarConfig, montarConfig, formVazio, formDeConfig, trocarModo, lerCaminho, escreverCaminho,
} from '../config.js';
import { esc, ligar } from '../dom.js';
import { formatarTempo } from '../tempo.js';

const AJUSTES = [
  { caminho: 'voltas', rotulo: 'Voltas', min: 1, max: 10, passo: 1, fmt: String },
  { caminho: 'tempoMimica', rotulo: 'Tempo de mímica', min: 30, max: 300, passo: 15, fmt: formatarTempo },
  { caminho: 'tempoLeitura', rotulo: 'Tempo de leitura', min: 5, max: 30, passo: 5, fmt: (s) => `${s} s` },
  { caminho: 'mix.facil', rotulo: 'Itens fáceis', min: 0, max: 3, passo: 1, fmt: String },
  { caminho: 'mix.medio', rotulo: 'Itens médios', min: 0, max: 3, passo: 1, fmt: String },
  { caminho: 'mix.dificil', rotulo: 'Itens difíceis', min: 0, max: 3, passo: 1, fmt: String },
  { caminho: 'pontos.facil', rotulo: 'Pontos — fácil', min: 1, max: 5, passo: 1, fmt: String },
  { caminho: 'pontos.medio', rotulo: 'Pontos — médio', min: 1, max: 5, passo: 1, fmt: String },
  { caminho: 'pontos.dificil', rotulo: 'Pontos — difícil', min: 1, max: 5, passo: 1, fmt: String },
];

const RESUMO_PADRAO = `${PADRAO.voltas} voltas · 1 fácil, 1 médio e 1 difícil por vez · `
  + `${PADRAO.tempoLeitura} s de leitura · ${formatarTempo(PADRAO.tempoMimica)} de mímica · `
  + `pontos ${PADRAO.pontos.facil}/${PADRAO.pontos.medio}/${PADRAO.pontos.dificil}`;

const botaoSegmento = (grupo, valor, rotulo, ativo) =>
  `<button data-acao="${grupo}" data-valor="${valor}" aria-pressed="${ativo}">${rotulo}</button>`;

export function telaConfiguracao(el, { temas, configSalva, aoVoltar, aoComecar }) {
  let form = configSalva ? formDeConfig(configSalva) : formVazio();
  form.temas = form.temas.filter((id) => temas.some((t) => t.id === id));

  function timeHtml(time, i) {
    const individual = form.modo === 'individual';
    const campos = time.membros.map((nome, j) => `
      <input class="campo" data-time="${i}" data-membro="${j}" value="${esc(nome)}"
        placeholder="${individual ? `Jogador ${i + 1}` : `Pessoa ${j + 1}`}" maxlength="20" autocomplete="off"
        aria-label="${individual ? `Nome do jogador ${i + 1}` : `Dupla ${i + 1}, pessoa ${j + 1}`}">`).join('');
    const remover = form.times.length > 2
      ? `<button class="btn btn-pequeno" data-acao="remover" data-time="${i}" aria-label="Remover">✕</button>`
      : '';
    return individual
      ? `<div class="linha">${campos}${remover}</div>`
      : `<div class="dupla"><div class="muted">Dupla ${i + 1}</div><div class="linha">${campos}${remover}</div></div>`;
  }

  const stepperHtml = (a) => `
    <div class="stepper">
      <span>${a.rotulo}</span>
      <div class="linha">
        <button data-acao="menos" data-caminho="${a.caminho}" aria-label="Diminuir ${a.rotulo}">−</button>
        <span class="valor">${a.fmt(lerCaminho(form.extras, a.caminho))}</span>
        <button data-acao="mais" data-caminho="${a.caminho}" aria-label="Aumentar ${a.rotulo}">+</button>
      </div>
    </div>`;

  function render() {
    const individual = form.modo === 'individual';
    el.innerHTML = `
      <div class="linha"><button class="btn btn-pequeno" data-acao="voltar">‹ Voltar</button><h1>Nova partida</h1></div>
      <section class="card">
        <h2>Modo</h2>
        <div class="segmentado">
          ${botaoSegmento('modo', 'duplas', 'Duplas', !individual)}${botaoSegmento('modo', 'individual', 'Individual', individual)}
        </div>
        <p class="muted">${individual
          ? 'Um faz, todos adivinham. Pontuam quem fez e quem acertou.'
          : 'Um faz, o parceiro adivinha. Os papéis invertem a cada vez.'}</p>
      </section>
      <section class="card">
        <h2>${individual ? 'Jogadores' : 'Duplas'}</h2>
        ${form.times.map(timeHtml).join('')}
        <div class="linha"><button class="btn btn-pequeno" data-acao="adicionar">+ ${individual ? 'Jogador' : 'Dupla'}</button></div>
      </section>
      <section class="card">
        <h2>Temas</h2>
        <div class="chips">${temas.map((t) => `
          <button class="chip" data-acao="tema" data-id="${esc(t.id)}" aria-pressed="${form.temas.includes(t.id)}">${esc(t.emoji)} ${esc(t.nome)}</button>`).join('')}
        </div>
      </section>
      <section class="card">
        <h2>Regras</h2>
        <div class="segmentado">
          ${botaoSegmento('regras', 'padrao', 'Padrão', !form.personalizado)}${botaoSegmento('regras', 'personalizado', 'Personalizado', form.personalizado)}
        </div>
        ${form.personalizado ? AJUSTES.map(stepperHtml).join('') : `<p class="muted">${RESUMO_PADRAO}</p>`}
      </section>
      <div class="rodape">
        <ul class="erros" data-erros></ul>
        <button class="btn btn-primario" data-acao="comecar">Começar</button>
      </div>`;
    atualizarErros();
  }

  function atualizarErros() {
    const erros = validarConfig(montarConfig(form));
    el.querySelector('[data-erros]').innerHTML = erros.map((e) => `<li>${esc(e)}</li>`).join('');
    el.querySelector('[data-acao="comecar"]').disabled = erros.length > 0;
  }

  function ajustar(caminho, direcao) {
    const a = AJUSTES.find((x) => x.caminho === caminho);
    const novo = Math.min(a.max, Math.max(a.min, lerCaminho(form.extras, caminho) + direcao * a.passo));
    escreverCaminho(form.extras, caminho, novo);
    render();
  }

  el.addEventListener('input', (ev) => {
    const campo = ev.target.closest('[data-membro]');
    if (!campo) return;
    form.times[Number(campo.dataset.time)].membros[Number(campo.dataset.membro)] = campo.value;
    atualizarErros();
  });

  ligar(el, {
    voltar: aoVoltar,
    modo: (b) => {
      form = trocarModo(form, b.dataset.valor);
      render();
    },
    adicionar: () => {
      form.times.push({ membros: Array(form.modo === 'duplas' ? 2 : 1).fill('') });
      render();
      el.querySelector(`[data-time="${form.times.length - 1}"][data-membro="0"]`)?.focus();
    },
    remover: (b) => {
      form.times.splice(Number(b.dataset.time), 1);
      render();
    },
    tema: (b) => {
      const id = b.dataset.id;
      form.temas = form.temas.includes(id) ? form.temas.filter((x) => x !== id) : [...form.temas, id];
      b.setAttribute('aria-pressed', String(form.temas.includes(id)));
      atualizarErros();
    },
    regras: (b) => {
      form.personalizado = b.dataset.valor === 'personalizado';
      render();
    },
    menos: (b) => ajustar(b.dataset.caminho, -1),
    mais: (b) => ajustar(b.dataset.caminho, 1),
    comecar: () => {
      const config = montarConfig(form);
      if (validarConfig(config).length === 0) aoComecar(config);
    },
  });

  render();
}
```

- [ ] **Step 2: Verificar no navegador (390×844)**

Expected:
- Abre em Duplas com 2 duplas vazias; "Começar" desabilitado e erros "Preencha todos os nomes." e "Escolha pelo menos 1 tema.".
- Digitar nomes não perde o foco; erros somem conforme preenche.
- Trocar para Individual mantém os nomes já digitados.
- "+ Dupla"/"+ Jogador" adiciona e foca; "✕" aparece só com 3+.
- Nomes "Ana" e " ana " → "Há nomes repetidos.".
- Nome `<b>x</b>` aparece literal no campo.
- Personalizado mostra 9 steppers respeitando os limites (ex.: mímica não passa de 5:00 nem desce de 0:30); zerar os três mixes → "Total de itens por vez: de 1 a 6.".
- "Começar" leva à tela da vez ("Em construção." até a Task 8).
- Voltar ao Início e "Jogar" de novo → formulário vem preenchido com a última configuração.
- Sem rolagem horizontal; `npm test` PASS.

- [ ] **Step 3: Commit**

```bash
git add js/telas/configuracao.js
git commit -m "feat: tela de configuração da partida"
```

---

### Task 8: Telas da partida (vez, leitura, mímica, resultado, final)

**Files:**
- Modify (substituir inteiros): `js/telas/vez.js`, `js/telas/leitura.js`, `js/telas/mimica.js`, `js/telas/resultado.js`, `js/telas/final.js`

**Interfaces:**
- Consumes: `esc`, `itemHtml`, `placarHtml`, `ligar` (Task 4); `formatarTempo`, `iniciarCronometro` (Task 4); `bip`, `vibrar` (Task 6); props listadas na Task 6.
- Produces: as cinco funções de tela com as props da Task 6. `telaMimica` chama `aoTerminar(resultados)` com um `Resultado` por item, na ordem de `itens`.

- [ ] **Step 1: `js/telas/vez.js`**

```js
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
```

- [ ] **Step 2: `js/telas/leitura.js`**

```js
import { itemHtml, ligar } from '../dom.js';
import { formatarTempo, iniciarCronometro } from '../tempo.js';
import { bip, vibrar } from '../efeitos.js';

export function telaLeitura(el, { itens, segundos, aoFim }) {
  el.innerHTML = `
    <p class="muted centro">Memorize! Só você pode ver.</p>
    <div class="cronometro" data-tempo>${formatarTempo(segundos)}</div>
    <div class="barra"><div data-barra style="width:100%"></div></div>
    <div class="lista-itens">${itens.map((item) => itemHtml(item)).join('')}</div>
    <div class="rodape"><button class="btn" data-acao="pular">Já li, começar</button></div>`;

  const tempo = el.querySelector('[data-tempo]');
  const barra = el.querySelector('[data-barra]');
  let encerrado = false;
  const encerrar = () => {
    if (encerrado) return;
    encerrado = true;
    parar();
    aoFim();
  };
  const parar = iniciarCronometro(segundos, {
    aoTick: (r) => {
      tempo.textContent = formatarTempo(r);
      barra.style.width = `${(r / segundos) * 100}%`;
    },
    aoFim: () => {
      bip();
      vibrar(100);
      encerrar();
    },
  });
  ligar(el, { pular: encerrar });
  return parar;
}
```

- [ ] **Step 3: `js/telas/mimica.js`**

```js
import { esc, itemHtml, ligar } from '../dom.js';
import { formatarTempo, iniciarCronometro } from '../tempo.js';
import { bip, vibrar } from '../efeitos.js';

export function telaMimica(el, { itens, segundos, modo, jogadores, aoTerminar }) {
  const resultados = itens.map(() => ({ acertou: false, acertouTime: null }));
  let escolhendo = null; // índice do item esperando "quem acertou?" (modo individual)

  el.innerHTML = `
    <div class="cronometro" data-tempo>${formatarTempo(segundos)}</div>
    <div class="barra"><div data-barra style="width:100%"></div></div>
    <p class="muted centro" data-aviso>Marque ✓ quando acertarem.</p>
    <div class="lista-itens" data-itens></div>
    <div class="rodape"><button class="btn btn-primario" data-acao="terminar">Terminar</button></div>`;

  const lista = el.querySelector('[data-itens]');
  const tempo = el.querySelector('[data-tempo]');
  const barra = el.querySelector('[data-barra]');
  const aviso = el.querySelector('[data-aviso]');
  const botaoTerminar = el.querySelector('[data-acao="terminar"]');
  const nomeDe = (time) => jogadores.find((j) => j.time === time)?.nome ?? '';

  function renderItens() {
    lista.innerHTML = itens.map((item, i) => {
      const r = resultados[i];
      const escolha = escolhendo === i
        ? `<div class="escolher-quem"><span class="muted">Quem acertou?</span>${jogadores
          .map((j) => `<button class="chip" data-acao="quem" data-item="${i}" data-time="${j.time}">${esc(j.nome)}</button>`)
          .join('')}</div>`
        : '';
      return itemHtml(item, {
        animar: false,
        acertou: r.acertou,
        nota: r.acertouTime !== null ? `· ${nomeDe(r.acertouTime)}` : '',
        extra: `<button class="check" data-acao="marcar" data-item="${i}" aria-pressed="${r.acertou}" aria-label="Acertou">✓</button>${escolha}`,
      });
    }).join('');
  }

  const parar = iniciarCronometro(segundos, {
    aoTick: (r) => {
      tempo.textContent = formatarTempo(r);
      barra.style.width = `${(r / segundos) * 100}%`;
      tempo.classList.toggle('alerta', r > 0 && r <= 10);
    },
    aoFim: () => {
      tempo.textContent = 'Tempo!';
      tempo.classList.remove('alerta');
      aviso.textContent = 'Tempo esgotado! Marque o que acertaram e toque em Ver resultado.';
      botaoTerminar.textContent = 'Ver resultado';
      vibrar([300, 100, 300]);
      bip({ vezes: 3 });
    },
  });

  ligar(el, {
    marcar: (b) => {
      const i = Number(b.dataset.item);
      if (resultados[i].acertou) {
        resultados[i] = { acertou: false, acertouTime: null };
        escolhendo = null;
      } else if (modo === 'individual') {
        escolhendo = escolhendo === i ? null : i;
      } else {
        resultados[i] = { acertou: true, acertouTime: null };
      }
      renderItens();
    },
    quem: (b) => {
      resultados[Number(b.dataset.item)] = { acertou: true, acertouTime: Number(b.dataset.time) };
      escolhendo = null;
      renderItens();
    },
    terminar: () => {
      parar();
      aoTerminar(resultados);
    },
  });

  renderItens();
  return parar;
}
```

- [ ] **Step 4: `js/telas/resultado.js`**

```js
import { esc, itemHtml, ligar, placarHtml } from '../dom.js';

export function telaResultado(el, { registro, placar, ultimaVez, nomeQuemAcertou, aoProximo }) {
  const nota = (item) => {
    if (!item.acertou) return '· não saiu';
    return item.acertouTime !== null ? `· ${nomeQuemAcertou(item.acertouTime)} acertou` : '· acertou';
  };
  el.innerHTML = `
    <section class="card capa entrar">
      <div class="emoji">${registro.ganhos > 0 ? '🎉' : '😅'}</div>
      <div class="destaque">+${registro.ganhos} ${registro.ganhos === 1 ? 'ponto' : 'pontos'}</div>
      <p class="muted">${esc(registro.quemFaz)} fez a mímica</p>
    </section>
    <div class="lista-itens">${registro.itens.map((item) => itemHtml(item, {
      acertou: item.acertou,
      nota: nota(item),
      extra: `<span class="marca">${item.acertou ? '✓' : '✗'}</span>`,
    })).join('')}</div>
    <section class="card"><h2>Placar</h2>${placarHtml(placar)}</section>
    <div class="rodape">
      <button class="btn btn-primario" data-acao="proximo">${ultimaVez ? 'Ver placar final' : 'Próximo'}</button>
    </div>`;
  ligar(el, { proximo: aoProximo });
}
```

- [ ] **Step 5: `js/telas/final.js`**

```js
import { esc, ligar } from '../dom.js';

const MEDALHAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function telaFinal(el, { placar, aoJogarDeNovo, aoInicio }) {
  const vencedores = placar.filter((l) => l.posicao === 1).map((l) => esc(l.nome));
  el.innerHTML = `
    <section class="card capa entrar">
      <div class="emoji">🏆</div>
      <p class="muted">${vencedores.length > 1 ? 'Empate!' : 'Vitória de'}</p>
      <h1>${vencedores.join(' e ')}</h1>
    </section>
    <ol class="placar final">${placar.map((l) => `
      <li><span>${MEDALHAS[l.posicao] ?? `${l.posicao}º`} ${esc(l.nome)}</span><b>${l.pontos}</b></li>`).join('')}
    </ol>
    <div class="rodape">
      <button class="btn btn-primario" data-acao="denovo">Jogar de novo</button>
      <button class="btn" data-acao="inicio">Início</button>
    </div>`;
  ligar(el, { denovo: aoJogarDeNovo, inicio: aoInicio });
}
```

- [ ] **Step 6: Verificar uma partida inteira no navegador (390×844)**

Para acelerar, usar Personalizado: 1 volta, mímica 0:30, leitura 5 s.
Expected:
- **Duplas** (Ana/Beto × Caio/Duda, 3 temas): vez 1 "Ana faz → Beto adivinha"; Sortear → 3 itens, cada um de um tema diferente, ordem fácil/médio/difícil, contagem 5→0, cai na mímica sozinho ("Já li, começar" também funciona). Marcar fácil e difícil → resultado "+4 pontos"; placar Ana & Beto 4. Ordem das vezes: Ana, Caio, Beto, Duda; depois "Ver placar final" → 🏆 com ranking.
- **Individual** (3 jogadores): ✓ abre "Quem acertou?" sem o nome de quem faz; escolher → item verde com "· Nome"; tocar ✓ de novo desmarca. Resultado mostra "Nome acertou" e o placar soma para os dois.
- Deixar o tempo zerar: "Tempo!", aviso e botão "Ver resultado"; ainda dá para marcar.
- Os 10 s finais pulsam em vermelho.
- Recarregar a página no meio da partida → Início oferece "Continuar partida" e volta na mesma vez, com o mesmo placar.
- "Sair" na tela da vez → Início com "Continuar partida".
- "Jogar de novo" reinicia com a mesma configuração e o placar zerado.
- Emulando `prefers-color-scheme: dark`, contraste ok; nada rola na horizontal; console sem erros.
- `npm test` PASS.

- [ ] **Step 7: Commit**

```bash
git add js/telas
git commit -m "feat: telas da partida (vez, leitura, mímica, resultado, final)"
```

---

### Task 9: PWA, ícones e publicação

**Files:**
- Create: `manifest.json`, `sw.js`, `tools/gerar_icones.py`, `icons/icon-192.png`, `icons/icon-512.png`, `README.md`
- Modify: `index.html` (links de manifest/ícone), `js/app.js` (registro do SW)
- Test: `test/sw.test.js`

**Interfaces:**
- Consumes: todos os arquivos servidos das tasks anteriores.
- Produces: `ARQUIVOS` em `sw.js` como array JSON válido (aspas duplas) — o teste depende disso.

- [ ] **Step 1: Escrever o teste que falha — `test/sw.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const raiz = new URL('..', import.meta.url).pathname;
const fonte = readFileSync(join(raiz, 'sw.js'), 'utf8');
const arquivos = JSON.parse(fonte.match(/const ARQUIVOS = (\[[\s\S]*?\]);/)[1]);

const listar = (dir) => readdirSync(join(raiz, dir), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? listar(join(dir, e.name)) : [join(dir, e.name)]);

test('todo arquivo do cache existe', () => {
  for (const arquivo of arquivos.filter((a) => a !== './')) {
    assert.ok(existsSync(join(raiz, arquivo)), `${arquivo} não existe`);
  }
});

test('todo arquivo servido está no cache (offline completo)', () => {
  const servidos = ['index.html', 'manifest.json', ...['css', 'data', 'icons', 'js'].flatMap(listar)];
  for (const arquivo of servidos) assert.ok(arquivos.includes(arquivo), `${arquivo} fora do cache`);
});

test('caminhos relativos (site fica em /mimica/)', () => {
  assert.ok(arquivos.every((a) => !a.startsWith('/')));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `ENOENT ... sw.js`

- [ ] **Step 3: `tools/gerar_icones.py` e gerar os PNGs**

```python
"""Gera icons/icon-192.png e icons/icon-512.png (fundo roxo, 🎭 desenhado com formas simples)."""
from pathlib import Path
from PIL import Image, ImageDraw

ROXO = (109, 40, 217)
CORES = [(21, 128, 61), (217, 119, 6), (220, 38, 38)]


def icone(tamanho: int) -> Image.Image:
    img = Image.new("RGB", (tamanho, tamanho), ROXO)
    d = ImageDraw.Draw(img)
    u = tamanho / 100
    # rosto (dentro da zona segura de 80% para ícone maskable)
    d.ellipse([28 * u, 22 * u, 72 * u, 66 * u], fill=(255, 255, 255))
    d.ellipse([38 * u, 36 * u, 45 * u, 43 * u], fill=ROXO)
    d.ellipse([55 * u, 36 * u, 62 * u, 43 * u], fill=ROXO)
    d.arc([39 * u, 40 * u, 61 * u, 58 * u], 20, 160, fill=ROXO, width=max(2, int(3 * u)))
    # três pontos = fácil / médio / difícil
    for i, cor in enumerate(CORES):
        cx = (38 + i * 12) * u
        d.ellipse([cx - 4 * u, 72 * u, cx + 4 * u, 80 * u], fill=cor)
    return img


if __name__ == "__main__":
    pasta = Path(__file__).resolve().parent.parent / "icons"
    pasta.mkdir(exist_ok=True)
    for t in (192, 512):
        icone(t).save(pasta / f"icon-{t}.png")
```

Run: `python3 -I tools/gerar_icones.py && ls icons`
Expected: `icon-192.png  icon-512.png`

- [ ] **Step 4: `manifest.json`**

```json
{
  "name": "Sorteia Mímica",
  "short_name": "Mímica",
  "description": "Sorteia itens de mímica por tema e dificuldade, marca o tempo e soma os pontos.",
  "lang": "pt-BR",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f6f3ff",
  "theme_color": "#6d28d9",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 5: `sw.js`**

```js
const CACHE = 'mimica-v1';
const ARQUIVOS = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "data/temas.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "js/app.js",
  "js/armazenamento.js",
  "js/config.js",
  "js/dom.js",
  "js/efeitos.js",
  "js/jogo.js",
  "js/sorteio.js",
  "js/tempo.js",
  "js/telas/comoJogar.js",
  "js/telas/configuracao.js",
  "js/telas/erro.js",
  "js/telas/final.js",
  "js/telas/inicio.js",
  "js/telas/leitura.js",
  "js/telas/mimica.js",
  "js/telas/resultado.js",
  "js/telas/vez.js"
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys().then((chaves) =>
    Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))));
  self.clients.claim();
});

// Responde do cache na hora e atualiza em segundo plano (a versão nova vale na próxima abertura).
self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET' || new URL(ev.request.url).origin !== self.location.origin) return;
  ev.respondWith(caches.open(CACHE).then(async (cache) => {
    const emCache = await cache.match(ev.request, { ignoreSearch: true });
    const daRede = fetch(ev.request)
      .then((resposta) => {
        if (resposta.ok) cache.put(ev.request, resposta.clone());
        return resposta;
      })
      .catch(() => emCache);
    return emCache || daRede;
  }));
});
```

- [ ] **Step 6: Ligar no HTML e no app**

Em `index.html`, depois do `<title>`:
```html
  <link rel="manifest" href="manifest.json">
  <link rel="icon" href="icons/icon-192.png">
  <link rel="apple-touch-icon" href="icons/icon-192.png">
```

No fim de `js/app.js`, antes de `iniciar();`:
```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npm test`
Expected: PASS (todos, incluindo `sw.test.js`).

- [ ] **Step 8: `README.md`**

```markdown
# Sorteia Mímica

Jogo de mímica para jogar num celular só: escolha os temas, sorteie, encene e some os pontos.

**Jogar:** https://sorteia-mimica.github.io/

## Desenvolvimento

- Sem build: abra com qualquer servidor estático, ex. `python3 -m http.server 8123`.
- Testes: `npm test` (Node 22+).
- Temas: edite `data/temas.json` (mínimo 20 itens por dificuldade) e rode os testes.
- Ao adicionar um arquivo servido, inclua-o em `ARQUIVOS` no `sw.js` (o teste avisa).
- Ícones: `python3 tools/gerar_icones.py` (requer Pillow).
```

- [ ] **Step 9: Verificar offline no navegador**

Com o servidor rodando: abrir a página, recarregar uma vez (SW ativo), parar o servidor, recarregar.
Expected: o app abre e uma partida inteira funciona sem servidor; DevTools/Application mostra o manifest com os dois ícones.

- [ ] **Step 10: Commit**

```bash
git add manifest.json sw.js tools icons README.md index.html js/app.js test/sw.test.js
git commit -m "feat: PWA offline, ícones e README"
```

- [ ] **Step 11: Publicar (pedir confirmação ao usuário antes — é ação externa)**

```bash
gh auth setup-git
git push -u origin main
gh api -X POST repos/sorteia-mimica/mimica/pages -f "source[branch]=main" -f "source[path]=/"
gh api repos/sorteia-mimica/mimica/pages --jq '.html_url, .status'
```
Expected: `https://sorteia-mimica.github.io/`; depois do build do Pages, abrir no celular e verificar que carrega e instala ("Adicionar à tela inicial").
