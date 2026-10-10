# Sorteia Mímica — Design

**Data:** 2026-10-10
**Repo:** `sorteia-mimica/mimica` (GitHub Pages)

## Objetivo

Jogo de mímica para grupos, rodando num único celular que passa de mão em mão. O app sorteia o que cada jogador deve fazer, controla o tempo e soma os pontos. Mobile-first, mas funciona em desktop.

Sucesso = um grupo consegue configurar uma partida em menos de 1 minuto (modo Padrão), jogar sem internet e chegar ao placar final sem ninguém precisar anotar nada.

## Restrições

- Hospedado no GitHub Pages: site estático, sem backend, sem sessão compartilhada entre aparelhos.
- Um único aparelho por partida.
- HTML + CSS + JavaScript puro (ES modules), sem build e sem dependências de runtime.
- Interface em português do Brasil.

## Modos de jogo

### Duplas
- Mínimo 2 duplas. Cada dupla tem 2 nomes.
- Na vez da dupla, um faz a mímica e o parceiro adivinha. Os papéis invertem na próxima vez daquela dupla.
- Item acertado → pontos para a dupla.

### Individual
- Mínimo 2 jogadores.
- Um faz a mímica, todos os outros tentam adivinhar.
- Item acertado → quem fez **e** quem acertou ganham os pontos do item. Durante a mímica só se marca ✓; depois do tempo (ou ao encerrar a vez) abre a **conferência**, onde dá para corrigir os ✓ e escolher quem acertou cada item.

### Volta e fim da partida
- **Uma volta** = todos os jogadores fizeram mímica uma vez.
  - Individual: cada jogador faz uma vez, na ordem cadastrada.
  - Duplas: as duplas alternam (Dupla 1, Dupla 2, …, Dupla 1, Dupla 2, …); cada dupla joga 2 vezes por volta, uma com cada parceiro fazendo.
- A partida termina ao completar o número de voltas configurado.

## Configuração

### Padrão (rápida)
O usuário escolhe apenas:
- Modo (Duplas / Individual)
- Nomes
- Temas (pelo menos 1)

Valores fixos:
| Opção | Valor |
|---|---|
| Voltas | 3 |
| Itens por vez | 3 — 1 fácil, 1 médio, 1 difícil |
| Tempo de leitura | 10 s |
| Tempo de mímica | 1 min 30 s |
| Pontos | fácil 1, médio 2, difícil 3 |

### Personalizado
Abre, além do Padrão:
- Número de voltas (1–10)
- Tempo de mímica (30 s – 5 min, passos de 15 s)
- Tempo de leitura (5–30 s)
- Quantidade de itens por dificuldade (0–3 cada, total entre 1 e 6)
- Pontos por dificuldade (1–5 cada)

## Temas

Sete temas iniciais, cada um com ~20 itens por dificuldade (~60 por tema), em `data/temas.json`:

| Tema | Notas / exemplos |
|---|---|
| Filmes/Séries | — |
| Profissão | — |
| Animal | — |
| Esportes | Sem futebol (futebol tem tema próprio) |
| Futebol | Mistura jogadores, fundamentos, táticas e coisas do futebol. Evitar itens óbvios (cabecear, carrinho). Fácil: marcação. Médio: caneta, tesoura, pressionar. Difícil: marcação por zona, finalizar no ângulo, Campeonato Brasileiro |
| Ações do dia a dia | Fácil: escovar os dentes, lavar louça. Médio: perder o ônibus, procurar a chave, pisar em Lego. Difícil: montar móvel sem manual |
| Famosos | Fácil: Neymar, Xuxa, Silvio Santos. Médio: Anitta, Faustão, Ayrton Senna. Difícil: Einstein, Chaves, Gretchen |

Formato:
```json
[
  {
    "id": "futebol",
    "nome": "Futebol",
    "emoji": "⚽",
    "itens": { "facil": ["..."], "medio": ["..."], "dificil": ["..."] }
  }
]
```

## Regras de sorteio

1. Monta-se a lista de dificuldades da vez a partir da configuração (padrão: `[facil, medio, dificil]`), embaralhada.
2. Cada item da vez vem de um **tema diferente**:
   - Temas escolhidos ≥ itens da vez → sorteia temas distintos sem repetição.
   - Temas escolhidos < itens da vez → usa todos e repete temas o mais equilibrado possível.
3. Com 3 temas e 3 itens, sai sempre 1 de cada tema; qual tema fica com qual dificuldade é sorteado.
4. Um item não se repete na mesma partida. Se uma lista (tema + dificuldade) esgotar, ela é reembaralhada e volta a ser usada.
5. Cada item exibido mostra o tema (emoji + nome) e a dificuldade; quem faz pode anunciar o tema em voz alta.

## Fluxo de telas

1. **Início** — "Jogar", "Como jogar"; "Continuar partida" se houver uma salva.
2. **Configuração** — modo, nomes, temas, Padrão/Personalizado.
3. **Vez de jogar** — "Vez de Ana (faz) → Beto (adivinha)" ou "Vez de Ana"; placar resumido; botão **Sortear**.
4. **Leitura** — itens visíveis só para quem faz, contagem regressiva do tempo de leitura.
5. **Mímica** — cronômetro; itens na tela; quem faz marca só ✓ em cada item (dá para desmarcar). Botão "Terminar" encerra antes. No fim: vibração + som.
6. **Conferência** (só no Individual) — após o tempo ou o fim da vez: corrige os ✓ e escolhe quem acertou cada item. No Duplas, a mímica vai direto para o resultado.
7. **Resultado da vez** — itens acertados/errados, pontos ganhos; "Próximo".
8. **Placar final** — ranking com 🏆; "Jogar de novo" (mesma configuração) e "Início".

## Arquitetura

```
index.html
css/style.css
data/temas.json
js/app.js          # bootstrap, roteamento entre telas, persistência
js/sorteio.js      # lógica pura de sorteio
js/jogo.js         # lógica pura da partida (ordem, rodízio, pontuação, fim)
js/telas/*.js      # uma tela por arquivo, só UI
manifest.json
sw.js              # cache offline (PWA)
icons/
test/*.test.js     # node --test
```

### Unidades

- **`sorteio.js`** — `sortearVez({ temas, temasEscolhidos, mix, usados, rng }) → { itens, usados }`. Pura; `rng` injetável para testes.
- **`jogo.js`** — estado da partida como objeto serializável. Funções puras:
  - `criarPartida(config) → estado`
  - `vezAtual(estado) → { quemFaz, quemAdivinha?, time }`
  - `sortear(estado, temas) → estado` (preenche os itens da vez)
  - `registrarVez(estado, resultados) → estado` (resultados = lista de `{ acertou, acertouTime? }`; soma pontos e avança para a próxima vez)
  - `terminou(estado) → boolean`, `placar(estado) → ranking`
- **Telas** — recebem estado e callbacks; não contêm regra de jogo.
- **`app.js`** — carrega `temas.json`, guarda `estado` e última configuração no `localStorage` a cada mudança, troca de tela.

### Cronômetro
- Calculado por `Date.now()` contra um instante final, não por contagem de ticks — não atrasa com a aba em segundo plano.
- Screen Wake Lock durante leitura e mímica (ignorado silenciosamente se não suportado).
- Fim do tempo: `navigator.vibrate` (se disponível) + som curto gerado por Web Audio.

### Persistência
- `localStorage`: última configuração e partida em andamento. Acesso envolto em try/catch; sem storage o jogo funciona, só não retoma.

### Visual
- Mobile-first, botões grandes, alto contraste.
- Cores por dificuldade: fácil verde, médio amarelo, difícil vermelho.
- Animações leves no sorteio e no cronômetro; respeita `prefers-reduced-motion`.
- Tema claro/escuro via `prefers-color-scheme`.

## Erros e casos de borda

- Configuração inválida (nomes vazios/duplicados, menos de 2 jogadores/duplas, nenhum tema, mix com 0 itens) → botão "Começar" desabilitado com a mensagem do motivo.
- Falha ao carregar `temas.json` → mensagem com botão "Tentar de novo".
- Estado salvo corrompido/incompatível → descartado, volta ao Início.

## Testes

- `node --test` cobrindo `sorteio.js` (temas distintos, repetição equilibrada, sem repetição de item, reembaralhar ao esgotar, mix personalizado) e `jogo.js` (ordem das vezes nos dois modos, rodízio na dupla, pontuação individual para quem faz e quem acerta, fim após N voltas, serialização).
- Telas validadas manualmente no navegador em viewport de celular.

## Deploy

GitHub Pages servindo a branch `main` na raiz. Caminhos relativos em todo lugar (o site fica em `/mimica/`).

## Fora de escopo

- Multi-aparelho / sessão online.
- Edição de temas pela interface.
- Outros minigames.
