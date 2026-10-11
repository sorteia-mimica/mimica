import { juntarNomes } from './premios.js';

// Compartilhar o resultado: texto (puro, testado) + imagem PNG gerada no canvas (só no navegador).
// `resumo` = { placar, premios, desempate: null | { vencedores: [nomes] } }.

export const LINK_DO_JOGO = 'https://sorteia-mimica.github.io/mimica/';
const MEDALHAS = { 1: '🥇', 2: '🥈', 3: '🥉' };
const medalha = (posicao) => MEDALHAS[posicao] ?? `${posicao}º`;
const pts = (n) => `${n} ${n === 1 ? 'pt' : 'pts'}`;

// Linha de destaque do resultado: quem ganhou (ou o empate).
export function manchete({ placar, desempate }) {
  const vencedores = placar.filter((l) => l.posicao === 1).map((l) => l.nome);
  if (desempate) {
    return desempate.vencedores.length > 1
      ? { emoji: '🤝', texto: `Vitória dividida: ${juntarNomes(desempate.vencedores)}` }
      : { emoji: '⚡', texto: `Vitória de ${desempate.vencedores[0]} no desempate` };
  }
  return vencedores.length > 1
    ? { emoji: '🤝', texto: `Empate entre ${juntarNomes(vencedores)}` }
    : { emoji: '🏆', texto: `Vitória de ${vencedores[0]}` };
}

export function textoDoResultado(resumo) {
  const { emoji, texto } = manchete(resumo);
  const linhas = ['🎭 Sorteia Mímica: placar final', '', `${emoji} ${texto}`, ''];
  linhas.push(...resumo.placar.map((l) => `${medalha(l.posicao)} ${l.nome} — ${pts(l.pontos)}`));
  if (resumo.premios.length > 0) {
    linhas.push('', '🏅 Prêmios da noite');
    linhas.push(...resumo.premios.map((p) => `${p.emoji} ${p.titulo}: ${p.quem} (${p.detalhe})`));
  }
  linhas.push('', `Bora jogar também? ${LINK_DO_JOGO}`);
  return linhas.join('\n');
}

// ---------- Imagem (canvas 1080×1350, retrato de feed) ----------

const LARGURA = 1080;
const ALTURA = 1350;
const FONTE = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MAX_LINHAS_PLACAR = 5;

// Corta com "…" até caber na largura.
function caber(ctx, texto, largura) {
  if (ctx.measureText(texto).width <= largura) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > largura) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function retangulo(ctx, x, y, w, h, r, cor) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = cor;
  ctx.fill();
}

function desenhar(ctx, resumo) {
  const fundo = ctx.createLinearGradient(0, 0, LARGURA, ALTURA);
  fundo.addColorStop(0, '#6d28d9');
  fundo.addColorStop(1, '#a21caf');
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  // Bolinhas de confete discretas só nas laterais (não passam por cima do texto), sempre nos mesmos lugares.
  const cores = ['#f59e0b', '#22c55e', '#3b82f6', '#f472b6', '#fde68a'];
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = cores[i % cores.length];
    ctx.beginPath();
    const x = i % 2 ? 22 + ((i * 37) % 42) : LARGURA - 22 - ((i * 29) % 42);
    ctx.arc(x, 30 + ((i * 487) % (ALTURA - 60)), 6 + (i % 3) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `120px ${FONTE}`;
  ctx.fillText('🎭', LARGURA / 2, 130);
  ctx.font = `900 78px ${FONTE}`;
  ctx.fillText('Sorteia Mímica', LARGURA / 2, 250);
  ctx.font = `700 38px ${FONTE}`;
  ctx.globalAlpha = 0.85;
  ctx.fillText('PLACAR FINAL', LARGURA / 2, 315);
  ctx.globalAlpha = 1;

  const { emoji, texto } = manchete(resumo);
  ctx.font = `850 52px ${FONTE}`;
  ctx.fillText(caber(ctx, `${emoji} ${texto}`, LARGURA - 120), LARGURA / 2, 395);

  // Pódio + prêmios (os que couberem), centralizados na faixa entre a manchete e o rodapé.
  const margem = 80;
  const [topo, base] = [450, ALTURA - 110];
  const linhas = resumo.placar.slice(0, MAX_LINHAS_PLACAR);
  const restantes = resumo.placar.length - linhas.length;
  const alturaPodio = linhas.reduce((soma, l) => soma + (l.posicao === 1 ? 118 : 98), 0) + (restantes > 0 ? 40 : 0);
  const premios = resumo.premios.slice(0, Math.max(0, Math.floor((base - topo - alturaPodio - 70) / 100)));
  const alturaTotal = alturaPodio + (premios.length > 0 ? 70 + premios.length * 100 : 0);
  let y = topo + Math.max(0, (base - topo - alturaTotal) / 2);
  for (const l of linhas) {
    const alto = l.posicao === 1 ? 104 : 84;
    retangulo(ctx, margem, y, LARGURA - margem * 2, alto, 28, l.posicao === 1 ? '#fde68a' : 'rgba(255,255,255,0.92)');
    ctx.fillStyle = '#1d1530';
    ctx.textAlign = 'left';
    ctx.font = `${l.posicao === 1 ? 850 : 750} ${l.posicao === 1 ? 46 : 38}px ${FONTE}`;
    const pontos = pts(l.pontos);
    const larguraPontos = ctx.measureText(pontos).width;
    ctx.fillText(caber(ctx, `${medalha(l.posicao)} ${l.nome}`, LARGURA - margem * 2 - larguraPontos - 90), margem + 32, y + alto / 2);
    ctx.textAlign = 'right';
    ctx.fillText(pontos, LARGURA - margem - 32, y + alto / 2);
    y += alto + 14;
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  if (restantes > 0) {
    ctx.font = `700 30px ${FONTE}`;
    ctx.fillText(`+ ${restantes} na sequência`, LARGURA / 2, y + 12);
    y += 40;
  }

  if (premios.length > 0) {
    y += 30;
    ctx.font = `800 34px ${FONTE}`;
    ctx.globalAlpha = 0.85;
    ctx.fillText('🏅 PRÊMIOS DA NOITE', LARGURA / 2, y);
    ctx.globalAlpha = 1;
    y += 40;
    for (const p of premios) {
      retangulo(ctx, margem, y, LARGURA - margem * 2, 88, 24, 'rgba(255,255,255,0.16)');
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = `48px ${FONTE}`;
      ctx.fillText(p.emoji, margem + 24, y + 44);
      ctx.font = `700 28px ${FONTE}`;
      ctx.globalAlpha = 0.8;
      ctx.fillText(p.titulo.toUpperCase(), margem + 100, y + 28);
      ctx.globalAlpha = 1;
      ctx.font = `850 36px ${FONTE}`;
      ctx.fillText(caber(ctx, p.quem, LARGURA - margem * 2 - 130), margem + 100, y + 62);
      y += 100;
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 32px ${FONTE}`;
  ctx.globalAlpha = 0.9;
  ctx.fillText(LINK_DO_JOGO.replace('https://', ''), LARGURA / 2, ALTURA - 60);
  ctx.globalAlpha = 1;
}

// Acima disso o PNG (degradê + confete pesam) vira JPEG: o share no 4G/WhatsApp fica leve e a diferença não aparece.
const LIMITE_PNG = 1_000_000;
const QUALIDADE_JPEG = 0.92;

// Imagem do resultado (PNG, ou JPEG se o PNG passar de ~1 MB); null se o navegador não souber desenhar (nunca lança).
export async function gerarImagem(resumo) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = LARGURA;
    canvas.height = ALTURA;
    const ctx = canvas.getContext('2d');
    if (!ctx?.roundRect) return null;
    desenhar(ctx, resumo);
    const blob = (tipo, qualidade) => new Promise((ok) => canvas.toBlob((b) => ok(b), tipo, qualidade));
    const png = await blob('image/png');
    if (!png || png.size <= LIMITE_PNG) return png;
    const jpeg = await blob('image/jpeg', QUALIDADE_JPEG);
    return jpeg?.type === 'image/jpeg' && jpeg.size < png.size ? jpeg : png;
  } catch {
    return null;
  }
}

// Aviso rápido no pé da tela (some sozinho).
export function avisar(texto) {
  document.querySelector('.aviso')?.remove();
  const el = document.createElement('div');
  el.className = 'aviso';
  el.setAttribute('role', 'status');
  el.textContent = texto;
  document.body.append(el);
  setTimeout(() => el.remove(), 2600);
}

// Share nativo (com a imagem, se o aparelho aceitar arquivo); senão copia o texto. Nunca lança.
// `imagem` precisa já estar pronta: esperar a geração aqui gastaria o "toque" que o share exige.
export async function compartilharResultado(resumo, imagem = null) {
  const texto = textoDoResultado(resumo);
  try {
    if (typeof navigator.share === 'function') {
      const dados = { title: 'Sorteia Mímica', text: texto };
      if (imagem) {
        const jpeg = imagem.type === 'image/jpeg';
        const arquivo = new File([imagem], `sorteia-mimica.${jpeg ? 'jpg' : 'png'}`, { type: jpeg ? 'image/jpeg' : 'image/png' });
        if (navigator.canShare?.({ files: [arquivo] })) dados.files = [arquivo];
      }
      await navigator.share(dados);
      return 'compartilhado';
    }
  } catch (erro) {
    // AbortError: a pessoa desistiu. InvalidStateError: segundo toque com o share ainda aberto.
    // Nos dois casos nada de copiar escondido.
    if (erro?.name === 'AbortError' || erro?.name === 'InvalidStateError') return 'cancelado';
  }
  try {
    await navigator.clipboard.writeText(texto);
    avisar('Copiado! Cola no grupo 😉');
    return 'copiado';
  } catch {
    avisar('Não deu pra compartilhar daqui 😕');
    return 'falhou';
  }
}
