let wakeLock = null;
let querTelaAcesa = false;
let pedido = 0;
let audio = null;

export async function manterTelaAcesa() {
  querTelaAcesa = true;
  const meu = ++pedido;
  try {
    const lock = (await navigator.wakeLock?.request('screen')) ?? null;
    if (!querTelaAcesa || meu !== pedido) {
      // a tela foi liberada (ou outro pedido passou na frente) enquanto este estava no ar: solta já
      lock?.release().catch(() => {});
      return;
    }
    wakeLock?.release().catch(() => {});
    wakeLock = lock;
  } catch {
    wakeLock = null;
  }
}

export function liberarTela() {
  querTelaAcesa = false;
  pedido++;
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

// Confete leve (só CSS transform/opacity). Some sozinho em ~2,5 s; nada com movimento reduzido.
const CORES_CONFETE = ['#8b5cf6', '#c026d3', '#f59e0b', '#22c55e', '#3b82f6', '#ef4444'];

export function confete(quantidade = 60) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {};
  const camada = document.createElement('div');
  camada.className = 'confete';
  camada.setAttribute('aria-hidden', 'true');
  const r = Math.random;
  for (let i = 0; i < quantidade; i++) {
    const p = document.createElement('i');
    p.style.cssText = `left:${r() * 100}%;background:${CORES_CONFETE[i % CORES_CONFETE.length]};`
      + `--x:${(r() - 0.5) * 160}px;--r:${(r() - 0.5) * 1440}deg;--d:${1.4 + r() * 0.9}s;--t:${r() * 0.4}s`;
    camada.append(p);
  }
  document.body.append(camada);
  const remover = () => camada.remove();
  const timer = setTimeout(remover, 2800);
  return () => {
    clearTimeout(timer);
    remover();
  };
}
