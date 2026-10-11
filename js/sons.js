import { contextoAudio } from './efeitos.js';

// Efeitos sonoros sintetizados com Web Audio (sem arquivos). Tudo passa por um ganho mestre.
const CHAVE_SOM = 'mimica:som';
const VOLUME_MESTRE = 0.5;

let ligado = true;
try {
  ligado = localStorage.getItem(CHAVE_SOM) !== 'off';
} catch {
  // sem storage: som ligado nesta visita
}

let mestre = null;
let mestreDoContexto = null;

export const somLigado = () => ligado;

export function alternarSom() {
  ligado = !ligado;
  try { localStorage.setItem(CHAVE_SOM, ligado ? 'on' : 'off'); } catch { /* vale só nesta visita */ }
  if (ligado) tocarAcerto(); // confirma que voltou a tocar
  return ligado;
}

// Liga um botão 🔊/🔇: pinta o estado atual e alterna ao tocar.
export function ligarBotaoSom(botao) {
  const pintar = () => {
    botao.textContent = ligado ? '🔊' : '🔇';
    botao.setAttribute('aria-label', ligado ? 'Desligar os sons' : 'Ligar os sons');
  };
  pintar();
  botao.addEventListener('click', () => {
    alternarSom();
    pintar();
  });
}

function saida(audio) {
  if (mestre && mestreDoContexto === audio) return mestre;
  mestre = audio.createGain();
  mestre.gain.value = VOLUME_MESTRE;
  mestre.connect(audio.destination);
  mestreDoContexto = audio;
  return mestre;
}

// Toca uma sequência de notas {f, dur, quando?, fim?, tipo?, vol?}; `quando` e `dur` em segundos.
function tocar(notas) {
  const audio = contextoAudio();
  if (!ligado || !audio) return;
  try {
    const destino = saida(audio);
    const t0 = audio.currentTime;
    for (const { f, dur, quando = 0, fim = f, tipo = 'sine', vol = 0.3 } of notas) {
      const inicio = t0 + quando;
      const osc = audio.createOscillator();
      const ganho = audio.createGain();
      osc.type = tipo;
      osc.frequency.setValueAtTime(f, inicio);
      if (fim !== f) osc.frequency.exponentialRampToValueAtTime(fim, inicio + dur);
      ganho.gain.setValueAtTime(0.0001, inicio);
      ganho.gain.linearRampToValueAtTime(vol, inicio + 0.01); // ataque curtinho: sem estalo
      ganho.gain.exponentialRampToValueAtTime(0.001, inicio + dur);
      osc.connect(ganho).connect(destino);
      osc.start(inicio);
      osc.stop(inicio + dur + 0.02);
    }
  } catch {
    // sem som
  }
}

// Notas iguais em tipo/volume, uma a cada `passo` segundos.
const arpejo = (freqs, passo, dur, extra = {}) => freqs.map((f, i) => ({ f, dur, quando: i * passo, ...extra }));

// Sortear: arpejo subindo.
export const tocarSorteio = () => tocar(arpejo([523, 659, 784, 1047], 0.07, 0.14, { tipo: 'triangle' }));

// Revelou os itens: "fuuup" subindo, curtinho.
export const tocarRevelar = () => tocar([{ f: 330, fim: 990, dur: 0.18, tipo: 'triangle', vol: 0.22 }]);

// Cada segundo final: suave na leitura, mais agudo e forte quando urgente.
export const tocarTique = ({ urgente = false } = {}) =>
  tocar([{ f: urgente ? 1400 : 700, dur: 0.06, tipo: 'square', vol: urgente ? 0.2 : 0.08 }]);

// "Valendo!": dois tons brilhantes subindo.
export const tocarValendo = () => tocar(arpejo([660, 990], 0.12, 0.2, { tipo: 'triangle', vol: 0.35 }));

// Fim do tempo: zumbido grave de buzina.
export const tocarBuzina = () => tocar([
  { f: 110, dur: 0.5, tipo: 'sawtooth', vol: 0.3 },
  { f: 117, dur: 0.5, tipo: 'square', vol: 0.15 },
]);

// Acertou: dois "dings" subindo.
export const tocarAcerto = () => tocar(arpejo([880, 1319], 0.08, 0.2, { tipo: 'triangle' }));

// Desmarcou: blip baixinho descendo.
export const tocarDesmarcar = () => tocar([{ f: 330, fim: 220, dur: 0.1, vol: 0.2 }]);

// Pontuou: "tã-dá!".
export const tocarTada = () => tocar([
  { f: 523, dur: 0.12, tipo: 'triangle' },
  { f: 659, dur: 0.12, quando: 0.1, tipo: 'triangle' },
  { f: 784, dur: 0.4, quando: 0.2, tipo: 'triangle', vol: 0.35 },
]);

// Zerou: trombone triste, "wah-wah-wah-waaah".
export const tocarWahWah = () => tocar([
  ...arpejo([311, 294, 277], 0.22, 0.2, { tipo: 'sawtooth', vol: 0.18 }),
  { f: 262, fim: 196, dur: 0.4, quando: 0.66, tipo: 'sawtooth', vol: 0.18 },
]);

// Vitória: fanfarra curta.
export const tocarFanfarra = () => tocar([
  ...arpejo([523, 523, 523], 0.13, 0.1, { tipo: 'square', vol: 0.15 }),
  { f: 659, dur: 0.2, quando: 0.39, tipo: 'square', vol: 0.15 },
  { f: 784, dur: 0.6, quando: 0.6, tipo: 'square', vol: 0.18 },
  { f: 1047, dur: 0.6, quando: 0.6, tipo: 'triangle', vol: 0.25 },
]);
