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
- Mínimo 3 jogadores. Com 2, quem faz e o único que adivinha ganham os mesmos pontos em todo acerto (empate garantido); a configuração avisa e sugere Duplas ("No individual precisa de 3+ — com 2 é empate garantido. Joga em dupla!"). Config/partida salvas com 2 pela regra antiga ainda abrem (o form ganha um 3º lugar vazio; a partida em andamento continua).
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
| Pontos | fácil 1, médio 2, difícil 4 |

### Personalizado
Abre, além do Padrão:
- Número de voltas (1–10)
- Tempo de mímica (30 s – 5 min, passos de 15 s)
- Tempo de leitura (5–30 s)
- Quantidade de itens por dificuldade (0–3 cada, total entre 1 e 6)
- Pontos por dificuldade (1–5 cada)
- Itens na mímica: Escondidos (segura pra espiar, padrão) / À mostra

O card Regras (Padrão e Personalizado) mostra a estimativa ao vivo: "N vezes · ≈ X min de jogo" (`estimarDuracao(config)` em `js/config.js`: vezes × (leitura + mímica + 25 s de troca); até 15 min arredonda no minuto, acima de 5 em 5).

## Temas

Sete temas iniciais, cada um com 50 itens por dificuldade (150 por tema), em `data/temas.json`:

| Tema | Notas / exemplos |
|---|---|
| Filmes/Séries | — |
| Profissão | — |
| Animal | — |
| Esportes | Sem futebol (futebol tem tema próprio) |
| Futebol | Mistura jogadores, fundamentos, táticas e coisas do futebol. Evitar itens óbvios (cabecear, carrinho). Fácil: marcação. Médio: caneta, tesoura, pressionar. Difícil: marcação por zona, finalizar no ângulo, Campeonato Brasileiro |
| Ações do dia a dia | Fácil: escovar os dentes, lavar louça. Médio: perder o ônibus, procurar a chave, pisar em Lego. Difícil: montar móvel sem manual |
| Famosos | Fácil: Neymar, Xuxa, Silvio Santos. Médio: Anitta, Faustão, Ayrton Senna. Difícil: Einstein, Chaves, Gretchen |

**Critério de dificuldade** — conta o esforço de fazer a mímica e ser adivinhado, não o quão rara é a palavra (50 itens por dificuldade em cada tema):
- **Fácil:** 1 gesto/movimento óbvio e icônico que quase todo mundo acerta em segundos (sinuca = taco + giz; nadar; escovar os dentes).
- **Médio:** precisa de 2–3 gestos ou de uma pequena cena, ou o gesto se confunde com outras coisas e pede contexto.
- **Difícil:** conceito abstrato, história com várias etapas, ou muito difícil de diferenciar de itens parecidos mesmo com cena (marcação por zona, montar móvel sem manual).

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
4. Um item não se repete na mesma partida **nem nas seguintes**: os itens usados (`usados`, por tema + dificuldade) ficam salvos e semeiam a próxima partida (nova ou revanche). Se uma lista esgotar, ela é reembaralhada e volta a ser usada.
5. Cada item exibido mostra o tema (emoji + nome) e a dificuldade; quem faz pode anunciar o tema em voz alta.

## Fluxo de telas

1. **Início** — "Jogar", "Como jogar"; "Continuar partida" se houver uma salva.
2. **Configuração** — modo, nomes, temas, Padrão/Personalizado.
3. **Vez de jogar** — selo "Volta X de Y · vez N de M" (ou "⚡ Desempate", via `vez.desempate`); bloco grande "📱 Celular com Ana" + "Ana faz → Beto adivinha" (Duplas) ou "Ana faz · o resto chuta" (Individual); frase engraçada menor; placar resumido; botão **Sortear**; "Sair" pede confirmação.
4. **Leitura** — primeiro um passo de privacidade "Só Ana olha 🙈" com **Segura pra revelar** (~600 ms segurando, barra enchendo; Enter/Espaço segurados; leitor de tela revela direto). Só então aparecem os itens e começa a contagem regressiva do tempo de leitura.
5. **Mímica** — cronômetro (cartão fica vermelho nos 10 s finais); itens **escondidos** por padrão (só tema, dificuldade e ✓; segura o cartão pra espiar, soltou some) — no Personalizado dá para deixar "À mostra"; quem faz marca só ✓ em cada item (dá para desmarcar). "Encerrar a vez" com tempo sobrando pede confirmação. No fim: tela pisca de vermelho (tom parado com movimento reduzido) + vibração + som. **Gabarito**: marcou todos os ✓ com o relógio rodando → o relógio para, faixa verde "Gabarito! 🎯" (~1,2 s, som + vibração, sem animação com movimento reduzido, sem desfazer) e a vez segue sozinha (conferência no Individual, resultado no Duplas).
6. **Conferência** (só no Individual) — após o tempo ou o fim da vez: corrige os ✓ e escolhe quem acertou cada item. No Duplas, a mímica vai direto para o resultado.
7. **Resultado da vez** — itens acertados/errados, pontos ganhos; "Próximo".
8. **Placar final** — ranking com 🏆; frase da capa conforme a margem (`tipoDeVitoria`: apertada até 2 pontos ou 5% do líder → "Na raça!"/"Por um triz"; folgada com 6+ pontos e ≥ 1/4 dos pontos do líder → "Vitória incontestável"); lanterninha via `fraseLanterna` (só com um único último; perdeu por 1–2 pontos → frase de "quase"; dupla concorda no plural, "ficaram"). "Revanche: jogar de novo" (mesma configuração, placar zerado e **ordem sorteada** por `embaralharOrdem`: times embaralhados, na dupla sorteia quem começa fazendo, e quem abriu a partida anterior nunca abre a revanche), "Compartilhar resultado" e "Início".
   - **Prêmios da noite** (`premios(estado)` em `js/premios.js`, puro, só do histórico; vezes de desempate não contam): 🥇 Mímica de ouro (mais pontos numa vez), 🧠 Leitor de mentes (só Individual: quem mais adivinhou), 💀 Item mais cabeludo (último difícil acertado, com quem fez e quem matou), 🐢 Travou geral (mais vezes zeradas), 🎯 Gabarito (vez com tudo certo, só com 2+ itens por vez). Nada de prêmio para ninguém, para todo mundo ou para mais de 3 empatados; no máximo 4, entrando um a um (sem animação com movimento reduzido).
   - **Desempate** — com empate no 1º lugar, oferece "⚡ Desempate" ou "Fica empatado mesmo". No desempate cada empatado (ordem de cadastro; na dupla, o primeiro faz e o parceiro adivinha) faz 1 vez extra com **1 item difícil**, no fluxo normal (leitura → mímica → resultado; no Individual sem a conferência de "quem acertou", já que só quem faz pontua) e **com os mesmos tempos da partida**. Só quem faz pontua, num placar à parte (o placar principal não muda). Quem fizer mais leva; se empatar de novo, a vitória é dividida. Só um desempate por partida. Com a oferta na tela a partida continua salva (recarregar volta ao Início com "Continuar partida", que reabre o final com a oferta); ela só é apagada em "Revanche", "Voltar ao início" ou "Fica empatado mesmo".
   - **Compartilhar** — `navigator.share` com texto (pódio, prêmios, link do jogo) e, se `navigator.canShare({ files })` aceitar, um PNG 1080×1350 desenhado em canvas (gerado ao abrir a tela, para o share sair no mesmo toque; se o PNG passar de ~1 MB vai como JPEG 92%). Sem share nativo: copia o texto e avisa "Copiado! Cola no grupo 😉". Cancelar o share (ou tocar de novo com ele aberto) não copia; nada lança.

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
  - `progresso(estado) → { atual, total } | null`, `embaralharOrdem(config, rng?) → config`
  - `criarPartida(config, usados?)`, `usadosValidos(valor)`; desempate: `empatadosNoTopo`, `iniciarDesempate`, `placarDesempate`, `resultadoDesempate`
- **Telas** — recebem estado e callbacks; não contêm regra de jogo.
- **`app.js`** — carrega `temas.json`, guarda `estado` e última configuração no `localStorage` a cada mudança, troca de tela.

### Cronômetro
- Calculado por `Date.now()` contra um instante final, não por contagem de ticks — não atrasa com a aba em segundo plano.
- Screen Wake Lock durante leitura e mímica (ignorado silenciosamente se não suportado).
- Fim do tempo: `navigator.vibrate` (se disponível) + som curto gerado por Web Audio.

### Persistência
- `localStorage`: última configuração (`mimica:config`), partida em andamento (`mimica:partida`, inclusive durante o desempate — campo opcional `desempate`, saves antigos continuam válidos) e itens já sorteados (`mimica:usados`, sobrevive ao fim da partida; valor corrompido é ignorado). Acesso envolto em try/catch; sem storage o jogo funciona, só não retoma.

### Visual
- Mobile-first, botões grandes, alto contraste.
- Cores por dificuldade: fácil verde, médio amarelo, difícil vermelho.
- Animações leves no sorteio e no cronômetro; respeita `prefers-reduced-motion`.
- Voltar do navegador/Android: fora do Início há sempre uma entrada do jogo no topo do histórico; ao chegar no Início ela (e entradas velhas de antes de um reload) é devolvida em silêncio (`js/voltar.js`: a volta só "termina" quando o popstate chega, e o modal só responde depois disso, para nenhum pushState cair por baixo da volta). Leitura, mímica e conferência seguram o voltar (fica na tela); Config, Como jogar, Vez e Resultado voltam ao Início (a partida fica salva); no Final vale como "Voltar ao início"; no Início sai do site com um voltar só (inclusive com entradas velhas de antes de um reload).
- Teclado: o foco de cada tela começa no título; no Início os botões 🔊/🌙 vêm logo depois dele (1º Tab). Steppers no limite ficam `aria-disabled` (apagados, ainda focáveis). Celular deitado (altura ≤ 500 px): rodapé fixo enxuto.
- Confirmações usam um modal do próprio jogo (`js/modal.js`), nunca `window.confirm`. O "voltar" com modal aberto só fecha o modal (ouvinte de `popstate` na fase de captura, antes do roteador, independente da ordem dos imports).
- Tema claro/escuro via `prefers-color-scheme`.

## Erros e casos de borda

- Configuração inválida (nomes vazios/duplicados, menos de 2 duplas ou 3 jogadores no Individual, nenhum tema, itens por vez fora de 1 a 6) → mensagem do motivo e "Começar" apagado (`aria-disabled`). "Faltou nome" só aparece depois do primeiro toque em "Começar" (não dá bronca antes de digitar); tocar com erro mostra a lista em vez de começar.
- Falha ao carregar `temas.json` → mensagem com botão "Tentar de novo".
- Estado salvo corrompido/incompatível → descartado, volta ao Início. A validação confere cada vez do histórico, `vezIndice` até o total, pontos ≥ 0 e desempate só depois das voltas; se mesmo assim o final não conseguir montar os prêmios, ele aparece sem prêmios.

## Testes

- `node --test` cobrindo `sorteio.js` (temas distintos, repetição equilibrada, sem repetição de item, reembaralhar ao esgotar, mix personalizado) e `jogo.js` (ordem das vezes nos dois modos, rodízio na dupla, pontuação individual para quem faz e quem acerta, fim após N voltas, serialização).
- Telas validadas manualmente no navegador em viewport de celular.

## Deploy

GitHub Pages servindo a branch `main` na raiz. Caminhos relativos em todo lugar (o site fica em `/mimica/`).

## Fora de escopo

- Multi-aparelho / sessão online.
- Edição de temas pela interface.
- Outros minigames.
