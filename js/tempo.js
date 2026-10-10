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

// Decide quando o "tique" toca: uma vez por segundo inteiro, só nos últimos `ate` segundos.
// Guarda o último segundo anunciado: os ticks de 200 ms e re-renders não repetem o som.
// Devolve o segundo (ceil do restante) a anunciar, ou null se não é hora.
export function criarAnunciadorDeSegundos(ate) {
  let ultimo = Infinity;
  return (restante) => {
    const s = Math.ceil(restante);
    if (s < 1 || s > ate || s >= ultimo) return null;
    ultimo = s;
    return s;
  };
}
