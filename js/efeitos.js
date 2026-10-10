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
