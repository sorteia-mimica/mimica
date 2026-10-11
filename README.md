# Sorteia Mímica

Jogo de mímica para jogar num celular só: escolha os temas, sorteie, encene e some os pontos.

**Jogar:** https://sorteia-mimica.github.io/mimica/

## Desenvolvimento

- Sem build: abra com qualquer servidor estático, ex. `python3 -m http.server 8123`.
- Testes: `npm test` (Node 22+).
- Temas: edite `data/temas.json` (exatamente 50 itens por dificuldade em cada tema; regra: 1 gesto óbvio = fácil, 2–3 gestos ou cena curta = médio, várias etapas ou fácil de confundir = difícil) e rode os testes.
- Ao adicionar um arquivo servido, inclua-o em `ARQUIVOS` no `sw.js` (o teste avisa).
- A cada deploy, suba o `CACHE` no `sw.js` (ex. `mimica-v5` → `mimica-v6`): é isso que faz a atualização chegar de uma vez só.
- Ícones: `python3 tools/gerar_icones.py` (requer Pillow).
