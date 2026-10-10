# Sorteia Mímica

Jogo de mímica para jogar num celular só: escolha os temas, sorteie, encene e some os pontos.

**Jogar:** https://sorteia-mimica.github.io/mimica/

## Desenvolvimento

- Sem build: abra com qualquer servidor estático, ex. `python3 -m http.server 8123`.
- Testes: `npm test` (Node 22+).
- Temas: edite `data/temas.json` (mínimo 20 itens por dificuldade) e rode os testes.
- Ao adicionar um arquivo servido, inclua-o em `ARQUIVOS` no `sw.js` (o teste avisa).
- Ícones: `python3 tools/gerar_icones.py` (requer Pillow).
